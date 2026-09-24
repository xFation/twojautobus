import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any


USERS_FILE = Path(__file__).resolve().parents[2] / "data" / "users.json"
_users_lock = Lock()


def _read_users() -> list[dict[str, Any]]:
    """Load users from the JSON data file."""
    with USERS_FILE.open("r", encoding="utf-8") as file:
        return json.load(file).get("users", [])


def find_user_by_email(email: str) -> dict[str, Any] | None:
    """Find a user by normalized e-mail address."""
    with _users_lock:
        return next((user for user in _read_users() if user.get("email", "").lower() == email), None)


def add_user(email: str, name: str, password_hash: str, birthdate: str | None) -> dict[str, Any]:
    """Create and persist a user in the JSON data file."""
    with _users_lock:
        users = _read_users()
        user = {
            "id": max((user.get("id", 0) for user in users), default=0) + 1,
            "email": email,
            "name": name.strip(),
            "birthdate": birthdate or "",
            "password": password_hash,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "recent_routes": [],
        }
        users.append(user)
        with USERS_FILE.open("w", encoding="utf-8") as file:
            json.dump({"users": users}, file, ensure_ascii=False, indent=4)
        return user
