# src/api/schemas/walk_forward.py
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class WalkForwardRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = Field(default=100000.0, gt=0)
    strategy_id: str = "regime_volatility_breakout"
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    train_ratio: float = Field(
        default=0.70,
        ge=0.40,
        le=0.90,
        description="Fraction of data reserved for In-Sample training",
    )
    risk_fraction: float = Field(default=0.01, ge=0.001, le=0.2)
    atr_multiplier_sl: float = Field(default=2.0, ge=0.5, le=10.0)
    atr_multiplier_tp: float = Field(default=4.0, ge=0.5, le=20.0)
    commission_bps: float = Field(default=5.0, ge=0.0)
    commission_fixed: float = Field(default=0.0, ge=0.0)
    slippage_bps: float = Field(default=2.0, ge=0.0)
    gap_slippage_enabled: bool = True


class ValidationMetricsBlock(BaseModel):
    total_return_pct: float
    cagr: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    total_trades: int
    win_rate_pct: float
    profit_factor: float


class ValidationTimelinePoint(BaseModel):
    time: str
    equity_is: float | None = None
    equity_oos: float | None = None
    is_oos: bool


class WalkForwardResponse(BaseModel):
    symbol: str
    strategy_id: str
    train_ratio: float
    split_date: str
    total_bars: int
    train_bars: int
    test_bars: int
    robustness_status: str  # "ROBUST" | "MODERATE" | "OVERFITTED"
    wfer: float
    sharpe_decay_pct: float
    in_sample: ValidationMetricsBlock
    out_of_sample: ValidationMetricsBlock
    combined_timeline: list[ValidationTimelinePoint]
