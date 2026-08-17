from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers import backtest_router, data_router, ml_router, ws_router

app = FastAPI(
    title="Automated Trading Bot API",
    version="0.1.0",
    description="Quantitative Backtesting and ML Optimization Backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_router.router, prefix="/api/data", tags=["data"])
app.include_router(backtest_router.router)
app.include_router(ml_router.router, prefix="/api/ml", tags=["ml"])
app.include_router(ws_router.router, prefix="/ws", tags=["websocket"])


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "operational", "system": "trading-bot-tfm"}
