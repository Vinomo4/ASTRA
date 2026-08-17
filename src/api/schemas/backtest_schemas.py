from __future__ import annotations

from pydantic import BaseModel, Field


class BacktestRequest(BaseModel):
    symbol: str = Field(default="AAPL", examples=["AAPL"])
    start_date: str = Field(default="2024-01-01", examples=["2024-01-01"])
    end_date: str = Field(default="2025-01-01", examples=["2025-01-01"])
    initial_capital: float = Field(default=100_000.0, ge=1_000.0)
    fast_ema: int = Field(default=20, ge=5, le=100)
    slow_ema: int = Field(default=50, ge=20, le=300)
    risk_fraction: float = Field(default=0.01, ge=0.001, le=0.1)


class BacktestResponse(BaseModel):
    symbol: str
    initial_capital: float
    final_equity: float
    total_return_pct: float
    cagr: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    total_trades: int
    equity_curve: dict[str, float]
