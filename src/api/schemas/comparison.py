# src/api/schemas/comparison.py
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class ComparisonModelConfig(BaseModel):
    strategy_id: str
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    name: str = "Strategy"


class ComparisonRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = Field(default=100000.0, gt=0)
    strategy_a: ComparisonModelConfig
    strategy_b: ComparisonModelConfig
    risk_fraction: float = Field(default=0.01, ge=0.001, le=0.2)
    atr_multiplier_sl: float = Field(default=2.0, ge=0.5, le=10.0)
    atr_multiplier_tp: float = Field(default=4.0, ge=0.5, le=20.0)
    commission_bps: float = Field(default=5.0, ge=0.0)
    commission_fixed: float = Field(default=0.0, ge=0.0)
    slippage_bps: float = Field(default=2.0, ge=0.0)
    gap_slippage_enabled: bool = True


class StrategyComparisonMetrics(BaseModel):
    strategy_name: str
    total_return_pct: float
    cagr: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    win_rate_pct: float
    profit_factor: float
    total_trades: int
    alpha: float
    beta: float
    total_frictions: float


class AlphaAttributionDelta(BaseModel):
    delta_return_pct: float
    delta_cagr: float
    delta_sharpe: float
    delta_max_dd: float
    delta_win_rate: float
    delta_alpha: float
    outperforming_strategy: str  # "A" | "B" | "TIE"


class ComparisonTimelinePoint(BaseModel):
    time: str
    equity_a: float
    equity_b: float
    benchmark_equity: float


class ComparisonResponse(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    strategy_a: StrategyComparisonMetrics
    strategy_b: StrategyComparisonMetrics
    attribution: AlphaAttributionDelta
    timeline: list[ComparisonTimelinePoint]
