# src/api/schemas/backtest_schemas.py
from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, Field

# Single source of truth for strategy metadata
from src.strategies.base_strategy import ParameterDefinition, StrategyMetadata


class StrategyListResponse(BaseModel):
    strategies: List[StrategyMetadata]


class SimulationBandPoint(BaseModel):
    trade_step: int
    p5: float
    p25: float
    p50: float
    p75: float
    p95: float


class MonteCarloAnalytics(BaseModel):
    num_simulations: int
    trade_count: int
    median_max_dd_pct: float
    p90_max_dd_pct: float
    p95_max_dd_pct: float
    p99_max_dd_pct: float
    risk_of_ruin_pct: float
    ruin_threshold_pct: float
    var_95_pct: float
    cvar_95_pct: float
    var_99_pct: float
    cvar_99_pct: float
    confidence_bands: List[SimulationBandPoint]


class BacktestRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = Field(default=100000.0, gt=0)

    # Dynamic Strategy Selection
    strategy_id: str = Field(
        default="regime_volatility_breakout",
        description="Identifier of the strategy registered in StrategyRegistry",
    )
    strategy_params: dict[str, Any] = Field(
        default_factory=dict,
        description="Dynamic key-value map matching the strategy's ParameterDefinition schema",
    )

    # Legacy direct parameters for backward compatibility
    fast_ema: Optional[int] = Field(default=20, gt=0)
    slow_ema: Optional[int] = Field(default=50, gt=0)

    # Risk Management Parameters
    risk_fraction: float = Field(default=0.01, gt=0, le=1.0)
    atr_multiplier_sl: float = Field(default=2.0, gt=0.0)
    atr_multiplier_tp: float = Field(default=4.0, gt=0.0)

    # Market Friction Parameters
    commission_bps: float = Field(default=5.0, ge=0.0)
    commission_fixed: float = Field(default=0.0, ge=0.0)
    slippage_bps: float = Field(default=2.0, ge=0.0)
    gap_slippage_enabled: bool = Field(default=True)

    # Monte Carlo Parameters
    num_simulations: int = Field(
        default=1_000,
        ge=100,
        le=10_000,
        description="Number of bootstrap resample iterations",
    )
    ruin_threshold_pct: float = Field(
        default=30.0,
        gt=0.0,
        lt=100.0,
        description="Drawdown threshold percentage that constitutes account ruin",
    )


class TradeItem(BaseModel):
    trade_id: str
    symbol: str
    side: str
    entry_time: str
    exit_time: str
    entry_price: float
    effective_entry_price: float
    exit_price: float
    effective_exit_price: float
    quantity: float
    gross_pnl: float
    fees_paid: float
    slippage_cost: float
    pnl: float
    pnl_pct: float
    exit_reason: str


class OHLCPoint(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class PortfolioSnapshot(BaseModel):
    time: str
    equity: float
    cash: float
    position_quantity: float
    position_avg_price: float
    unrealized_pnl: float
    drawdown_pct: float


class BenchmarkPoint(BaseModel):
    time: str
    equity: float
    return_pct: float


class EquityPoint(BaseModel):
    time: str
    value: float


class ExecutionMarker(BaseModel):
    time: str
    price: float
    nominal_price: Optional[float] = None
    side: str
    quantity: float
    reason: Optional[str] = None


class ActivePosition(BaseModel):
    symbol: str
    entry_time: str
    entry_price: float
    current_price: float
    quantity: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


class TradeAnalytics(BaseModel):
    win_rate_pct: float
    profit_factor: float
    payoff_ratio: float
    expectancy: float
    avg_win: float
    avg_loss: float
    avg_trade_duration_days: float
    max_consecutive_wins: int
    max_consecutive_losses: int


class BenchmarkAnalytics(BaseModel):
    benchmark_total_return_pct: float
    benchmark_cagr: float
    alpha: float
    beta: float
    calmar_ratio: float


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
    total_fees_paid: Optional[float] = 0.0
    total_slippage_paid: Optional[float] = 0.0
    trade_analytics: TradeAnalytics
    benchmark_analytics: BenchmarkAnalytics
    monte_carlo: Optional[MonteCarloAnalytics] = None
    active_position: Optional[ActivePosition] = None
    execution_markers: List[ExecutionMarker]
    equity_curve: List[EquityPoint]
    benchmark_curve: List[BenchmarkPoint]
    ohlc_history: List[OHLCPoint]
    snapshots: List[PortfolioSnapshot]
    trades: List[TradeItem]


# --- Strategy Preset Management Schemas ---


class StrategyPresetCreate(BaseModel):
    preset_name: str = Field(..., min_length=2, max_length=60, description="Unique preset name")
    strategy_id: str = Field(..., description="Target strategy identifier")
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    risk_fraction: float = Field(default=0.01, ge=0.001, le=0.2)
    atr_multiplier_sl: float = Field(default=2.0, ge=0.5, le=10.0)
    atr_multiplier_tp: float = Field(default=4.0, ge=0.5, le=20.0)
    commission_bps: float = Field(default=5.0, ge=0.0)
    commission_fixed: float = Field(default=0.0, ge=0.0)
    slippage_bps: float = Field(default=2.0, ge=0.0)
    gap_slippage_enabled: bool = True
    description: str = Field(default="", max_length=255)


class StrategyPresetResponse(StrategyPresetCreate):
    updated_at: str


class StrategyPresetListResponse(BaseModel):
    presets: List[StrategyPresetResponse]


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
    equity_is: Optional[float] = None
    equity_oos: Optional[float] = None
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
    combined_timeline: List[ValidationTimelinePoint]
