"""Define strategy comparison request and response schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ComparisonModelConfig(BaseModel):
    """Define one strategy included in a comparison request."""

    strategy_id: str
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    name: str = "Strategy"


class ComparisonRequest(BaseModel):
    """Represent settings for a two-strategy backtest comparison."""

    symbol: str
    start_date: str
    end_date: str
    timeframe: str = Field(default="1d", description="Bar interval: 15m, 1h, 4h, 1d, 1wk")
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
    """Represent performance metrics for one compared strategy."""

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
    """Represent metric differences and the outperforming strategy."""

    delta_return_pct: float
    delta_cagr: float
    delta_sharpe: float
    delta_max_dd: float
    delta_win_rate: float
    delta_alpha: float
    outperforming_strategy: str  # "A" | "B" | "TIE"


class ComparisonTimelinePoint(BaseModel):
    """Represent aligned strategy and benchmark equity values."""

    time: str
    equity_a: float
    equity_b: float
    benchmark_equity: float


class ComparisonResponse(BaseModel):
    """Represent the complete result of a strategy comparison."""

    symbol: str
    start_date: str
    end_date: str
    timeframe: str = "1d"
    strategy_a: StrategyComparisonMetrics
    strategy_b: StrategyComparisonMetrics
    attribution: AlphaAttributionDelta
    timeline: list[ComparisonTimelinePoint]
