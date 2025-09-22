"""SQLite helpers for persisting user profiles."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Tuple

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
    print("this is the email: + " + str(normalized_email))
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


def fetch_tasks_by_email_and_date(
    user_email: str,
    task_date: str,
) -> List[Dict[str, Any]]:
    """Retrieve the active tasks for a user on a specific date."""

    normalized_email = user_email.strip()
    if not normalized_email:
        return []

    query = (
        "SELECT id, description, date, time, user_email "
        "FROM tasks WHERE user_email = ? AND date = ? AND isactive = 1 "
        "ORDER BY time, id"
    )

    try:
        with _DB_LOCK:
            with closing(sqlite3.connect(DATABASE_PATH)) as connection:
                connection.row_factory = sqlite3.Row
                rows = connection.execute(query, (normalized_email, task_date)).fetchall()
    except sqlite3.Error as exc:  # pragma: no cover - defensive
        raise DatabaseError("Failed to fetch tasks") from exc
    
    # list of dictionary
    return [
        {
            "id": row["id"],
            "description": row["description"],
            "date": row["date"],
            "time": row["time"],
            "user_email": row["user_email"] or None,
        }
        for row in rows
    ]



def deactivate_task(task_id: int) -> bool:
    """Mark a task as inactive.

    Returns ``True`` when a row is updated and ``False`` when no matching task
    exists.
    """
    
    query = "UPDATE tasks SET isactive = 0 WHERE id = ? AND isactive = 1"

    try:
        with _DB_LOCK:
            with closing(sqlite3.connect(DATABASE_PATH)) as connection:
                cursor = connection.execute(query, (task_id,))
                connection.commit()
    except sqlite3.Error as exc:  # pragma: no cover - defensive
        raise DatabaseError("Failed to delete task") from exc

    return cursor.rowcount > 0