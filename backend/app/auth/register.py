from fastapi import APIRouter, HTTPException, status

from .models import add_user, find_user_by_email
from .password import hash_password
from .schemas import RegisterRequest, UserResponse


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> UserResponse:
	"""Create a new user account."""
	if find_user_by_email(payload.email):
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="Użytkownik już istnieje",
		)

	user = add_user(
		email=payload.email,
		name=payload.name,
		password_hash=hash_password(payload.password),
		birthdate=payload.birthdate.isoformat() if payload.birthdate else None,
	)
	return UserResponse.model_validate(user)
