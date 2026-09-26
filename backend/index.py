import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import initialize_database
from app.auth.login import router as login_router
from app.auth.register import router as register_router
from app.transit.routes import router as transit_router


DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://localhost:5173,http://localhost:5500,http://127.0.0.1:5500"
DEFAULT_PORT = 8000
FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"
PAGES_DIR = FRONTEND_DIR / "pages"


@asynccontextmanager
async def lifespan(_: FastAPI):
	initialize_database()
	yield


def get_allowed_origins() -> list[str]:
	"""Read allowed frontend origins from CORS_ORIGINS."""
	configured_origins = os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
	return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


app = FastAPI(
	title="Twoj Autobus API",
	description="API dla rozkładów jazdy i komunikacji miejskiej.",
	version="0.1.0",
	lifespan=lifespan,
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

app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="frontend-assets")
app.mount("/components", StaticFiles(directory=FRONTEND_DIR / "components"), name="frontend-components")


@app.get("/", tags=["system"])
async def read_root() -> RedirectResponse:
	"""Send the site root to the home page."""
	return RedirectResponse(url="/pages/home.html", status_code=307)


@app.get("/home.html", include_in_schema=False)
async def redirect_legacy_home() -> RedirectResponse:
	return RedirectResponse(url="/pages/home.html", status_code=307)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
	"""Return the current API health status."""
	return {"status": "ok"}


@app.get("/{requested_path:path}", include_in_schema=False)
async def serve_page_or_not_found(requested_path: str):
	"""Serve a page from frontend/pages or the site's HTML 404 page."""
	requested = Path(requested_path)
	if requested.suffix.lower() == ".html" and requested.parent in (Path("pages"), Path(".")):
		page_name = requested.name
		if page_name not in {"index.html", "404.html"}:
			page_path = PAGES_DIR / page_name
			if page_path.is_file():
				return FileResponse(page_path)

	if requested.parts and requested.parts[0] in {"auth", "transit", "health"}:
		return JSONResponse(status_code=404, content={"detail": "Not Found"})

	return FileResponse(PAGES_DIR / "404.html", status_code=404)


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(
		"index:app",
		host="0.0.0.0",
		port=int(os.getenv("PORT", str(DEFAULT_PORT))),
		reload=True,
	)
