import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.login import router as login_router
from app.auth.register import router as register_router
from app.transit.routes import router as transit_router


DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://localhost:5173"
DEFAULT_PORT = 8000


def get_allowed_origins() -> list[str]:
	"""Read allowed frontend origins from CORS_ORIGINS."""
	configured_origins = os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
	return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


app = FastAPI(
	title="Twoj Autobus API",
	description="API dla rozkładów jazdy i komunikacji miejskiej.",
	version="0.1.0",
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=get_allowed_origins(),
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(login_router)
app.include_router(register_router)
app.include_router(transit_router)


@app.get("/", tags=["system"])
async def read_root() -> dict[str, str]:
	"""Return basic information about the API."""
	return {"name": "Twoj Autobus API", "docs": "/docs"}


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
	"""Return the current API health status."""
	return {"status": "ok"}


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(
		"index:app",
		host="0.0.0.0",
		port=int(os.getenv("PORT", str(DEFAULT_PORT))),
		reload=True,
	)
