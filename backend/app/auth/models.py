from typing import Any

from app.database import create_user, find_user_by_email


def add_user(email: str, name: str, password_hash: str, birthdate: str | None) -> dict[str, Any]:
    """Create and persist a user in SQLite."""
    return create_user(email, name, password_hash, birthdate)
