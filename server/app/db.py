"""SQLite helpers for persisting user profiles and tasks."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Tuple

DATA_DIRECTORY = Path(__file__).resolve().parents[1] / "data"
DATABASE_PATH = DATA_DIRECTORY / "app.db"

_DB_LOCK = Lock()


class DatabaseError(RuntimeError):
    """Raised when a database operation fails."""


def init_db() -> None:
    """Ensure the SQLite database and users table exist."""

    DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)

    with closing(sqlite3.connect(DATABASE_PATH)) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                sub TEXT PRIMARY KEY,
                email TEXT,
                name TEXT,
                given_name TEXT,
                family_name TEXT,
                picture TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                user_email TEXT NOT NULL,
                isactive INTEGER NOT NULL DEFAULT 1
            )
            """
        )
       
        connection.commit()


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

    query = """
        INSERT INTO users (sub, email, name, given_name, family_name, picture, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(sub) DO UPDATE SET
            email=excluded.email,
            name=excluded.name,
            given_name=excluded.given_name,
            family_name=excluded.family_name,
            picture=excluded.picture,
            updated_at=CURRENT_TIMESTAMP
    """

    with _DB_LOCK:
        with closing(sqlite3.connect(DATABASE_PATH)) as connection:
            connection.execute(
                query,
                (
                    user["sub"],
                    user["email"],
                    user["name"],
                    user["given_name"],
                    user["family_name"],
                    user["picture"],
                ),
            )
            connection.commit()

    return user


def insert_task(
    description: str,
    task_date: str,
    task_time: str,
    user_email: str | None,
) -> Tuple[int, str | None]:
    """Insert a task row and return its identifier and normalized email."""

    insert_sql = (
        "INSERT INTO tasks (description, date, time, user_email, isactive) "
        "VALUES (?, ?, ?, ?, 1)"
    )
    normalized_email = (user_email or "").strip()

    try:
        with _DB_LOCK:
            with closing(sqlite3.connect(DATABASE_PATH)) as connection:
                # Parameter binding avoids SQL injection by keeping user input separate
                # from the SQL statement itself.
                cursor = connection.execute(
                    insert_sql,
                    (
                        description,
                        task_date,
                        task_time,
                        normalized_email,
                    ),
                )
                connection.commit()
    except sqlite3.Error as exc:  # pragma: no cover - defensive
        raise DatabaseError("Failed to insert task") from exc

    return cursor.lastrowid, (normalized_email or None)

