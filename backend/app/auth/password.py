import bcrypt


def hash_password(password: str) -> str:
	return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
	normalized_hash = password_hash.replace("$2y$", "$2b$", 1)
	try:
		return bcrypt.checkpw(password.encode("utf-8"), normalized_hash.encode("utf-8"))
	except ValueError:
		return False
