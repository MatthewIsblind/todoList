"""FastAPI entrypoint for the todoList authentication service."""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .auth import TokenVerificationError, validate_id_token
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


@app.get("/health")
async def health() -> Dict[str, str]:
    """Health check endpoint."""

    return {"status": "ok"}


def _process_id_token(id_token: str) -> Dict[str, Any]:
    payload = validate_id_token(id_token)
    user = upsert_user(payload)
    return user


@app.post("/auth/verify", response_model=VerifyResponse)
async def verify_token(body: VerifyRequest):
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


__all__ = ["app"]