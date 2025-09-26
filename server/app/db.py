"""Database helpers for persisting user profiles and tasks."""

from __future__ import annotations

import os
from contextlib import contextmanager, nullcontext
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Iterable, List, Tuple

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import NullPool

DATA_DIRECTORY = Path(__file__).resolve().parents[1] / "data"
DATABASE_PATH = DATA_DIRECTORY / "app.db"


class DatabaseError(RuntimeError):
    """Raised when a database operation fails."""


def _build_engine() -> Engine:
    """Return an SQLAlchemy engine based on the configured database URL."""

    database_url = os.getenv("DATABASE_URL")

    if database_url:
        url = database_url
    else:
        DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)
        url = f"sqlite:///{DATABASE_PATH}"

    if url.startswith("sqlite"):
        return create_engine(
            url,
            future=True,
            connect_args={"check_same_thread": False},
            poolclass=NullPool,
        )

    pool_size = int(os.getenv("DATABASE_POOL_SIZE", "5"))
    max_overflow = int(os.getenv("DATABASE_MAX_OVERFLOW", "2"))

    return create_engine(
        url,
        future=True,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
    )


ENGINE = _build_engine()

_DB_LOCK = Lock() if ENGINE.url.get_backend_name() == "sqlite" else None


@contextmanager
def _locked() -> Iterable[None]:
    """Yield while holding a lock when required for SQLite."""

    if _DB_LOCK is None:
        with nullcontext():
            yield
        return

    with _DB_LOCK:
        yield


def init_db() -> None:
    """Ensure the database schema exists."""

    users_sql = text(
        """
        CREATE TABLE IF NOT EXISTS users (
            sub TEXT PRIMARY KEY,
            email TEXT,
            name TEXT,
            given_name TEXT,
            family_name TEXT,
            picture TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    if ENGINE.url.get_backend_name() == "postgresql":
        tasks_sql = text(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id BIGSERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                user_email TEXT,
                isactive INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    else:
        tasks_sql = text(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                user_email TEXT,
                isactive INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

    with ENGINE.begin() as connection:
        connection.execute(users_sql)
        connection.execute(tasks_sql)


def upsert_user(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Insert or update a user record using the Cognito payload."""

    sub = payload.get("sub")
    if not sub:
        raise ValueError("ID token payload did not include a subject identifier.")

    user = {
        "sub": sub,
        "email": payload.get("email"),
        "name": payload.get("name"),
        "given_name": payload.get("given_name"),
        "family_name": payload.get("family_name"),
        "picture": payload.get("picture"),
    }

    query = text(
        """
        INSERT INTO users (sub, email, name, given_name, family_name, picture, created_at, updated_at)
        VALUES (:sub, :email, :name, :given_name, :family_name, :picture, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(sub) DO UPDATE SET
            email=excluded.email,
            name=excluded.name,
            given_name=excluded.given_name,
            family_name=excluded.family_name,
            picture=excluded.picture,
            updated_at=CURRENT_TIMESTAMP
        """
    )

    with _locked():
        try:
            with ENGINE.begin() as connection:
                connection.execute(query, user)
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise DatabaseError("Failed to upsert user") from exc

    return user


def insert_task(
    description: str,
    task_date: str,
    task_time: str,
    user_email: str | None,
) -> Tuple[int, str | None]:
    """Insert a task row and return its identifier and normalized email."""

    if ENGINE.url.get_backend_name() == "postgresql":
        insert_sql = text(
            """
            INSERT INTO tasks (description, date, time, user_email, isactive)
            VALUES (:description, :date, :time, :user_email, 1)
            RETURNING id
            """
        )
    else:
        insert_sql = text(
            """
            INSERT INTO tasks (description, date, time, user_email, isactive)
            VALUES (:description, :date, :time, :user_email, 1)
            """
        )

    normalized_email = (user_email or "").strip()

    try:
        with _locked():
            with ENGINE.begin() as connection:
                result = connection.execute(
                    insert_sql,
                    {
                        "description": description,
                        "date": task_date,
                        "time": task_time,
                        "user_email": normalized_email,
                    },
                )
                if ENGINE.url.get_backend_name() == "postgresql":
                    task_id = result.scalar_one()
                else:
                    task_id = result.lastrowid
    except SQLAlchemyError as exc:  # pragma: no cover - defensive
        raise DatabaseError("Failed to insert task") from exc

    return int(task_id), (normalized_email or None)


def fetch_tasks_by_email_and_date(
    user_email: str,
    task_date: str,
) -> List[Dict[str, Any]]:
    """Retrieve the active tasks for a user on a specific date."""

    normalized_email = user_email.strip()
    if not normalized_email:
        return []

    query = text(
        """
        SELECT id, description, date, time, user_email
        FROM tasks
        WHERE user_email = :user_email AND date = :task_date AND isactive = 1
        ORDER BY time, id
        """
    )

    try:
        with _locked():
            with ENGINE.connect() as connection:
                rows = connection.execute(
                    query,
                    {"user_email": normalized_email, "task_date": task_date},
                ).mappings().all()
    except SQLAlchemyError as exc:  # pragma: no cover - defensive
        raise DatabaseError("Failed to fetch tasks") from exc

    return [dict(row) for row in rows]



def deactivate_task(task_id: int) -> bool:
    """Mark a task as inactive.

    Returns ``True`` when a row is updated and ``False`` when no matching task
    exists.
    """

    query = text(
        """
        UPDATE tasks
        SET isactive = 0
        WHERE id = :task_id AND isactive = 1
        """
    )

    try:
        with _locked():
            with ENGINE.begin() as connection:
                result = connection.execute(query, {"task_id": task_id})
    except SQLAlchemyError as exc:  # pragma: no cover - defensive
        raise DatabaseError("Failed to delete task") from exc

    return result.rowcount > 0