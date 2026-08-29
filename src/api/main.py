"""Configure the FastAPI application and register its routes."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app.include_router(backtest_router)
