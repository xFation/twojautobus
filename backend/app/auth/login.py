import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, HTTPException, status

from .models import find_user_by_email
from .password import verify_password
from .schemas import AuthResponse, LoginRequest, UserResponse


router = APIRouter(prefix="/auth", tags=["auth"])
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-this-secret")
JWT_ALGORITHM = "HS256"
TOKEN_LIFETIME_MINUTES = 60


def create_access_token(user_id: int) -> str:
    """Create a JWT access token for a user."""
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expires_at}, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
	"""Authenticate a user and return a bearer token."""
	user = find_user_by_email(payload.email)
	if not user or not verify_password(payload.password, user.get("password", "")):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Nieprawidłowy e-mail lub hasło",
		)

	return AuthResponse(
		access_token=create_access_token(user["id"]),
		user=UserResponse.model_validate(user),
	)
