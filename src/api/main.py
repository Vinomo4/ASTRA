"""Configure the FastAPI application and register its routes."""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.api.routers import router as backtest_router

app = FastAPI(
    title="Quantitative Backtesting & Strategy Engine",
    description="High-performance algorithmic backtest and alpha attribution platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. API routes (must be registered before static file handlers)
app.include_router(backtest_router)

# 2. Serve compiled frontend distribution (React / Vite)
# Path resolves: src/api/main.py -> src/api -> src -> project root -> frontend/dist
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DIST_DIR = BASE_DIR / "frontend" / "dist"

if DIST_DIR.exists():
    # Mount Vite static assets directory (/assets/...)
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Catch-all route to serve specific static assets or fall back to React's index.html
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target_file = DIST_DIR / full_path
        if full_path and target_file.exists() and target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(DIST_DIR / "index.html")
