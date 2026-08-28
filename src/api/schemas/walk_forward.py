# src/api/schemas/walk_forward.py
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class WalkForwardRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    timeframe: str = Field(default="1d", description="Bar interval: 15m, 1h, 4h, 1d")
    initial_capital: float = Field(default=100000.0, gt=0)
    strategy_id: str = "regime_volatility_breakout"
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    train_duration_months: int = Field(
        default=12,
        ge=1,
        le=60,
        description="Initial calibration / training window in months",
    )
    test_step_months: int = Field(
        default=1,
        ge=1,
        le=12,
        description="Out-of-sample forward step window in months",
    )
    risk_fraction: float = Field(default=0.01, ge=0.001, le=0.2)
    atr_multiplier_sl: float = Field(default=2.0, ge=0.5, le=10.0)
    atr_multiplier_tp: float = Field(default=4.0, ge=0.5, le=20.0)
    commission_bps: float = Field(default=5.0, ge=0.0)
    commission_fixed: float = Field(default=0.0, ge=0.0)
    slippage_bps: float = Field(default=2.0, ge=0.0)
    gap_slippage_enabled: bool = True


class OOSEquityPoint(BaseModel):
    time: str
    value: float


# Modelos de compatibilidad para routers y serializaciones previas
class ValidationMetricsBlock(BaseModel):
    total_return_pct: float = 0.0
    cagr: float = 0.0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    max_drawdown_pct: float = 0.0
    total_trades: int = 0
    win_rate_pct: float = 0.0
    profit_factor: float = 0.0


class ValidationTimelinePoint(BaseModel):
    time: str
    equity_is: float | None = None
    equity_oos: float | None = None
    is_oos: bool = False


class WalkForwardResponse(BaseModel):
    symbol: str
    strategy_id: str
    timeframe: str = "1d"
    evaluation_period: str
    total_windows: int
    train_duration_months: int
    test_step_months: int
    initial_capital: float
    final_equity: float
    total_return_pct: float
    cagr: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    profit_factor: float
    win_rate_pct: float
    total_trades: int
    sharpe_is: float
    sharpe_oos: float
    wfer: float
    validation_status: str  # "ROBUST" | "MODERATE" | "OVERFITTED"
    oos_equity_curve: list[OOSEquityPoint]
