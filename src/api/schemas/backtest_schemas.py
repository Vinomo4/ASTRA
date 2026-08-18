# src/api/schemas/backtest_schemas.py
from __future__ import annotations
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class BacktestRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = Field(default=100000.0, gt=0)
    fast_ema: int = Field(default=20, gt=0)
    slow_ema: int = Field(default=50, gt=0)
    risk_fraction: float = Field(default=0.01, gt=0, le=1.0)
    atr_multiplier_sl: float = Field(default=2.0, gt=0.0)
    atr_multiplier_tp: float = Field(default=4.0, gt=0.0)

    # Market Friction Parameters
    commission_bps: float = Field(default=5.0, ge=0.0)
    commission_fixed: float = Field(default=0.0, ge=0.0)
    slippage_bps: float = Field(default=2.0, ge=0.0)
    gap_slippage_enabled: bool = Field(default=True)


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
    active_position: Optional[ActivePosition] = None
    execution_markers: List[ExecutionMarker]
    equity_curve: List[EquityPoint]
    benchmark_curve: List[BenchmarkPoint]
    ohlc_history: List[OHLCPoint]
    snapshots: List[PortfolioSnapshot]
    trades: List[TradeItem]
