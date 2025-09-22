"""FastAPI entrypoint for the todoList authentication service."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import closing
from datetime import date as date_cls, time as time_cls
from typing import Any, Dict, Tuple

from fastapi import FastAPI, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import AliasChoices, BaseModel, Field, field_validator

from .auth import (
    TokenExchangeError,
    TokenVerificationError,
    UserInfoError,
    exchange_code_for_tokens,
    fetch_userinfo,
    validate_id_token,
)
from .config import get_settings

from .db import (
    DatabaseError,
    fetch_tasks_by_email_and_date,
    init_db,
    insert_task,
    upsert_user,
)

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

class TaskCreate(BaseModel):
    id: int | None = None
    description: str = Field(min_length=1)
    date: str
    time: str
    user_email: str | None = Field(
        default=None,
        validation_alias=AliasChoices("user_email", "email"),
        serialization_alias="user_email",
    )

    @field_validator("description")
    @classmethod
    def _strip_description(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("description must not be empty")
        return stripped

    @field_validator("date")
    @classmethod
    def _normalize_date(cls, value: str) -> str:
        try:
            normalized = date_cls.fromisoformat(value)
        except ValueError as exc:  # pragma: no cover - defensive against user input
            raise ValueError("date must be in YYYY-MM-DD format") from exc
        return normalized.isoformat()

    @field_validator("time")
    @classmethod
    def _normalize_time(cls, value: str) -> str:
        try:
            normalized = time_cls.fromisoformat(value)
        except ValueError as exc:  # pragma: no cover - defensive against user input
            raise ValueError("time must be in HH:MM or HH:MM:SS format") from exc

        # Omit seconds when they are not supplied so the response matches the
        # frontend's expected HH:MM shape.
        return (
            normalized.strftime("%H:%M:%S")
            if normalized.second
            else normalized.strftime("%H:%M")
        )



class TaskResponse(BaseModel):
    id: int
    description: str
    date: str
    time: str
    user_email: str | None = None

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

@app.post("/tasks/addTask", response_model=TaskResponse, status_code=201)
def create_task(payload: TaskCreate) -> TaskResponse:
    logger.info(str(payload))
    try:
        task_id, user_email = insert_task(
            payload.description,
            payload.date,
            payload.time,
            payload.user_email,
        )
    except DatabaseError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail="Failed to save task") from exc

    saved_task = TaskResponse(
        id=task_id,
        description=payload.description,
        date=payload.date,
        time=payload.time,
        user_email=user_email or None,
    )

    
    # Returning a plain dictionary prevents FastAPI's response validation from
    # misinterpreting ``None`` as the entire payload when serialising the
    # Pydantic model. This keeps the schema contract the frontend expects while
    # still benefiting from ``response_model=TaskResponse``.
    return saved_task.model_dump()

@app.get("/tasks/getActiveTasksByEmail", response_model=list[TaskResponse])
def list_tasks(
    date: str = Query(..., description="Date to filter tasks (YYYY-MM-DD)."),
    user_email: str | None = Query(
        default=None,
        description="Email address to filter tasks (preferred parameter name).",
    ),
) -> list[Dict[str, Any]]:
    """Return active tasks for the supplied user and date."""

    
    if user_email is None or not user_email.strip():
        raise HTTPException(status_code=400, detail="A user email must be provided.")

    try:
        normalized_date = TaskCreate._normalize_date(date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        tasks = fetch_tasks_by_email_and_date(user_email, normalized_date)
    except DatabaseError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail="Failed to fetch tasks.") from exc

    task_models = [
        TaskResponse(
            id=task["id"],
            description=task["description"],
            date=task["date"],
            time=task["time"],
            user_email=task.get("user_email"),
        )
        for task in tasks
    ]

    return [task.model_dump() for task in task_models]

__all__ = ["app"]