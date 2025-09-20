"""FastAPI entrypoint for the todoList authentication service."""

from __future__ import annotations

import logging
from typing import Any, Dict, Tuple

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .auth import (
    TokenExchangeError,
    TokenVerificationError,
    UserInfoError,
    exchange_code_for_tokens,
    fetch_userinfo,
    validate_id_token,
)
from .config import get_settings
from .db import init_db, upsert_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()
init_db()

allow_all_origins = "*" in settings.allowed_origins

app = FastAPI(title="todoList Auth API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VerifyRequest(BaseModel):
    idToken: str = Field(min_length=1)


class VerifyResponse(BaseModel):
    ok: bool
    user: Dict[str, Any]


class ExchangeRequest(BaseModel):
    code: str = Field(min_length=1)
    redirectUri: str | None = None


class TokenBundle(BaseModel):
    idToken: str
    accessToken: str | None = None
    refreshToken: str | None = None
    expiresIn: int | None = None
    tokenType: str | None = None


class ExchangeResponse(BaseModel):
    ok: bool
    tokens: TokenBundle
    user: Dict[str, Any]


@app.get("/health")
async def health() -> Dict[str, str]:
    """Health check endpoint."""

    return {"status": "ok"}


def _process_id_token(id_token: str) -> Dict[str, Any]:
    logger.info("Verifying Cognito ID token")
    payload = validate_id_token(id_token)
    logger.info("Token verified for subject %s", payload.get("sub", "<unknown>"))
    user = upsert_user(payload)
    logger.info("User record updated for subject %s", user.get("sub", "<unknown>"))
    return user


def _exchange_code(code: str, redirect_uri: str | None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    logger.info(
        "Exchanging authorization code for tokens (redirect_uri=%s)",
        redirect_uri or "<default>",
    )
    tokens = exchange_code_for_tokens(code, redirect_uri)
    id_token = tokens.get("id_token")
    if not id_token:
        raise TokenExchangeError("Cognito token response did not include an id_token.")

    payload = validate_id_token(id_token)
    logger.info("Received ID token for subject %s", payload.get("sub", "<unknown>"))
    
    merged_payload: Dict[str, Any] = dict(payload)
    access_token = tokens.get("access_token")
    if access_token:
        try:
            userinfo = fetch_userinfo(access_token)
        except UserInfoError as exc:
            logger.info("Unable to fetch user info from Cognito: %s", exc)
        else:
            logger.info(
                "userinfo keys: [%s] | values: [%s]",
                ", ".join(map(str, userinfo.keys())),
                ", ".join(map(str, userinfo.values())),
            )
            merged_payload.update(userinfo)

    user = upsert_user(merged_payload)
    logger.info("User profile synchronized for subject %s", user.get("sub", "<unknown>"))
    return tokens, user


@app.post("/auth/verify", response_model=VerifyResponse)
async def verify_token(body: VerifyRequest):
    logger.info("/auth/verify called")
    try:
        user = await run_in_threadpool(_process_id_token, body.idToken)
    except TokenVerificationError as exc:
        logger.warning("Failed to verify Cognito token: %s", exc)
        return JSONResponse(status_code=401, content={"error": str(exc)})
    except ValueError as exc:
        logger.warning("Invalid Cognito payload: %s", exc)
        return JSONResponse(status_code=400, content={"error": str(exc)})
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Unexpected error while verifying token")
        return JSONResponse(status_code=500, content={"error": "Unable to verify token."})

    return {"ok": True, "user": user}


@app.post("/auth/exchange", response_model=ExchangeResponse)
async def exchange_code(body: ExchangeRequest):
    logger.info("/auth/exchange called")
    try:
        tokens, user = await run_in_threadpool(_exchange_code, body.code, body.redirectUri)
    except TokenExchangeError as exc:
        logger.warning("Failed to exchange authorization code: %s", exc)
        return JSONResponse(status_code=400, content={"error": str(exc)})
    except TokenVerificationError as exc:
        logger.warning("Received invalid ID token from Cognito: %s", exc)
        return JSONResponse(status_code=401, content={"error": str(exc)})
    except ValueError as exc:
        logger.warning("Unable to persist Cognito user: %s", exc)
        return JSONResponse(status_code=400, content={"error": str(exc)})
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Unexpected error while exchanging code")
        return JSONResponse(status_code=500, content={"error": "Unable to exchange authorization code."})

   
    token_bundle = TokenBundle(
        idToken=tokens.get("id_token"),
        accessToken=tokens.get("access_token"),
        refreshToken=tokens.get("refresh_token"),
        expiresIn=tokens.get("expires_in"),
        tokenType=tokens.get("token_type"),
    )

    return {"ok": True, "tokens": token_bundle, "user": user}


__all__ = ["app"]