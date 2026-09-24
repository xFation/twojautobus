from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterRequest(BaseModel):
	email: str = Field(min_length=3, max_length=254)
	name: str = Field(min_length=2, max_length=100)
	password: str = Field(min_length=8, max_length=128)
	birthdate: date | None = None

	@field_validator("email")
	@classmethod
	def normalize_email(cls, value: str) -> str:
		email = value.strip().lower()
		if "@" not in email or email.startswith("@") or email.endswith("@"):
			raise ValueError("Podaj poprawny adres e-mail")
		return email


class LoginRequest(BaseModel):
	email: str = Field(min_length=3, max_length=254)
	password: str = Field(min_length=1, max_length=128)

	@field_validator("email")
	@classmethod
	def normalize_email(cls, value: str) -> str:
		return value.strip().lower()


class UserResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	email: str
	name: str
	birthdate: str | None = None


class AuthResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"
	user: UserResponse
