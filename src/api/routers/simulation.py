"""Provide backtesting, strategy comparison, preset, and OOS audit endpoints."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.analytics.metrics import PerformanceAnalytics
from src.analytics.monte_carlo import MonteCarloSimulator
from src.api.schemas import (
    ActivePosition,
    BacktestRequest,
    BacktestResponse,
    BenchmarkAnalytics,
    BenchmarkPoint,
    EquityPoint,
    ExecutionMarker,
    MonteCarloAnalytics,
    OHLCPoint,
    PortfolioSnapshot,
    SimulationBandPoint,
    TradeAnalytics,
    TradeItem,
)
from src.backtester.event_engine import BacktestEngine
from src.data_engine.base_loader import BaseDataLoader
from src.data_engine.storage_manager import StorageManager
from src.data_engine.unified_loader import UnifiedDataLoader
from src.strategies import StrategyRegistry

router = APIRouter(prefix="/api/backtest", tags=["backtest"])
logger = logging.getLogger("uvicorn.error")

_DATA_CACHE: dict[tuple[str, str, str, str], pd.DataFrame] = {}
_DEFAULT_LOADER = UnifiedDataLoader()
PRESETS_FILE = Path("data/presets.json")


# ==========================================
# 1. Pydantic models for presets, OOS audits, and comparisons
# ==========================================
class PresetPayload(BaseModel):
    """Represent a saved strategy preset payload."""

    preset_name: str
    strategy_id: str
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    risk_fraction: float = 0.01
    atr_multiplier_sl: float = 2.0
    atr_multiplier_tp: float = 4.0
    commission_bps: float = 5.0
    commission_fixed: float = 0.0
    slippage_bps: float = 2.0
    gap_slippage_enabled: bool = True
    description: str = ""
    updated_at: str | None = None


class OOSAuditRequest(BaseModel):
    """Represent a request to audit an out-of-sample equity split."""

    equity_curve: list[EquityPoint]
    trades: list[TradeItem]
    split_ratio: float = Field(default=0.30, ge=0.10, le=0.90)


class OOSAuditResponse(BaseModel):
    """Represent out-of-sample audit metrics and validation status."""

    split_date: str
    is_trades_count: int
    oos_trades_count: int
    sharpe_is: float
    sharpe_oos: float
    wfer: float
    total_return_is_pct: float
    total_return_oos_pct: float
    max_dd_is_pct: float
    max_dd_oos_pct: float
    profit_factor_oos: float
    validation_status: str


class StrategyCompareSpec(BaseModel):
    """Define one strategy included in a comparison."""

    strategy_id: str
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    name: str = "Strategy"


class CompareRequest(BaseModel):
    """Represent a request to compare two strategies on the same market data."""

    symbol: str = Field(default="BTC-USD")
    start_date: str = Field(default="2022-01-01")
    end_date: str = Field(default="2025-12-31")
    timeframe: str = Field(default="4h")
    initial_capital: float = Field(default=100_000.0)
    risk_fraction: float = 0.01
    atr_multiplier_sl: float = 2.0
    atr_multiplier_tp: float = 4.0
    commission_bps: float = 5.0
    commission_fixed: float = 0.0
    slippage_bps: float = 2.0
    gap_slippage_enabled: bool = True
    strategy_a: StrategyCompareSpec
    strategy_b: StrategyCompareSpec


class StrategyCompareMetrics(BaseModel):
    """Represent performance metrics for one compared strategy."""

    strategy_id: str
    strategy_name: str
    total_return_pct: float
    cagr: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    alpha: float
    beta: float
    win_rate_pct: float
    profit_factor: float
    total_trades: int
    total_frictions: float


class AttributionSummary(BaseModel):
    """Summarize the performance differences between two strategies."""

    outperforming_strategy: str  # "A" or "B"
    delta_cagr: float
    delta_sharpe: float
    delta_alpha: float
    delta_return_pct: float
    delta_max_dd: float
    delta_win_rate: float


class TimelinePoint(BaseModel):
    """Represent aligned strategy and benchmark equity at one time point."""

    time: str
    equity_a: float
    equity_b: float
    benchmark_equity: float


class ComparisonResponse(BaseModel):
    """Represent the result of a two-strategy comparison."""

    symbol: str
    start_date: str
    end_date: str
    strategy_a: StrategyCompareMetrics
    strategy_b: StrategyCompareMetrics
    attribution: AttributionSummary
    timeline: list[TimelinePoint]


# ==========================================
# 2. Local preset utilities
# ==========================================
def _load_presets_from_disk() -> list[dict[str, Any]]:
    if not PRESETS_FILE.exists():
        return []
    try:
        with open(PRESETS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_presets_to_disk(presets: list[dict[str, Any]]) -> None:
    PRESETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PRESETS_FILE, "w", encoding="utf-8") as f:
        json.dump(presets, f, indent=2, ensure_ascii=False)


# ==========================================
# 3. Strategy and preset endpoints
# ==========================================
@router.get("/strategies")
async def get_strategies() -> dict[str, list[dict[str, Any]]]:
    """List metadata for all registered strategies.

    Returns:
        Registered strategy metadata.
    """
    metadata_list = []
    for strat_cls in StrategyRegistry._registry.values():
        if hasattr(strat_cls, "get_metadata"):
            meta = strat_cls.get_metadata()
            metadata_list.append(
                {
                    "id": meta.id,
                    "name": meta.name,
                    "description": meta.description,
                    "category": meta.category,
                    "parameters": [
                        {
                            "name": p.name,
                            "label": p.label,
                            "param_type": p.param_type,
                            "default": p.default,
                            "min_value": p.min_value,
                            "max_value": p.max_value,
                            "step": p.step,
                            "description": p.description,
                        }
                        for p in meta.parameters
                    ],
                }
            )
    return {"strategies": metadata_list}


@router.get("/presets")
async def get_presets() -> dict[str, list[dict[str, Any]]]:
    """List saved strategy presets.

    Returns:
        Saved preset payloads.
    """
    return {"presets": _load_presets_from_disk()}


@router.post("/presets")
async def save_preset(payload: PresetPayload) -> dict[str, str]:
    """Create or replace a strategy preset.

    Args:
        payload: Preset values to persist.

    Returns:
        The persistence status and confirmation message.
    """
    presets = _load_presets_from_disk()
    preset_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    preset_data["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    presets = [p for p in presets if p.get("preset_name") != payload.preset_name]
    presets.append(preset_data)

    _save_presets_to_disk(presets)
    return {"status": "success", "message": f"Preset '{payload.preset_name}' saved successfully."}


@router.delete("/presets/{preset_name}")
async def delete_preset(preset_name: str) -> dict[str, str]:
    """Delete a saved strategy preset.

    Args:
        preset_name: Name of the preset to delete.

    Returns:
        The deletion status and confirmation message.

    Raises:
        HTTPException: If the requested preset does not exist.
    """
    presets = _load_presets_from_disk()
    initial_len = len(presets)
    presets = [p for p in presets if p.get("preset_name") != preset_name]

    if len(presets) == initial_len:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_name}' not found.")

    _save_presets_to_disk(presets)
    return {"status": "success", "message": f"Preset '{preset_name}' deleted."}


# ==========================================
# 4. Market data ingestion
# ==========================================
def get_market_data(
    symbol: str,
    start_date: str,
    end_date: str,
    timeframe: str,
    storage: StorageManager,
    loader: BaseDataLoader | None = None,
) -> pd.DataFrame:
    """Load market data from cache, storage, or an external loader.

    Args:
        symbol: Market symbol to load.
        start_date: Inclusive start date.
        end_date: Inclusive end date.
        timeframe: Candle timeframe.
        storage: Persistent market data storage.
        loader: Optional external data loader.

    Returns:
        Chronologically ordered OHLCV market data.
    """
    cache_key = (symbol, start_date, end_date, timeframe)
    if cache_key in _DATA_CACHE:
        return _DATA_CACHE[cache_key].copy()

    start_ts = pd.to_datetime(start_date, utc=True)
    end_ts = pd.to_datetime(end_date, utc=True)

    df = storage.load_ohlcv(symbol, start_date, end_date, timeframe=timeframe)

    needs_fetch = True
    if not df.empty and len(df) >= 30:
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        df_min = df["timestamp"].min()
        df_max = df["timestamp"].max()

        if (df_min <= start_ts + pd.Timedelta(days=7)) and (
            df_max >= end_ts - pd.Timedelta(days=4)
        ):
            needs_fetch = False

    if needs_fetch:
        active_loader = loader or _DEFAULT_LOADER
        fetched_df = active_loader.fetch_ohlcv(
            symbol=symbol, start=start_date, end=end_date, timeframe=timeframe
        )
        if not fetched_df.empty:
            try:
                storage.save_ohlcv(fetched_df, timeframe=timeframe)
            except Exception:
                pass
            df = fetched_df

    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        df = df.sort_values("timestamp").reset_index(drop=True)
        _DATA_CACHE[cache_key] = df.copy()

    return df


# ==========================================
# 5. Single simulation endpoint
# ==========================================
@router.post("/run", response_model=BacktestResponse)
async def run_backtest(req: BacktestRequest) -> BacktestResponse:
    """Run one strategy backtest.

    Args:
        req: Backtest configuration and strategy parameters.

    Returns:
        Backtest metrics, analytics, trades, and chart data.

    Raises:
        HTTPException: If market data cannot be loaded or strategy parameters are invalid.
    """
    storage = StorageManager()
    loader = _DEFAULT_LOADER
    timeframe = getattr(req, "timeframe", "4h") or "4h"

    try:
        df = get_market_data(
            symbol=req.symbol,
            start_date=req.start_date,
            end_date=req.end_date,
            timeframe=timeframe,
            storage=storage,
            loader=loader,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail=f"Error loading data for {req.symbol} ({timeframe}): {exc}"
        ) from exc

    if df.empty:
        raise HTTPException(
            status_code=400, detail=f"No data available for {req.symbol} at {timeframe} resolution"
        )

    strategy_params = dict(req.strategy_params)
    try:
        strategy = StrategyRegistry.create(req.strategy_id, **strategy_params)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid parameters: {exc}") from exc

    engine = BacktestEngine(
        strategy=strategy,
        initial_capital=req.initial_capital,
        risk_fraction=req.risk_fraction,
        atr_multiplier_sl=req.atr_multiplier_sl,
        atr_multiplier_tp=req.atr_multiplier_tp,
        commission_bps=req.commission_bps,
        commission_fixed=req.commission_fixed,
        slippage_bps=req.slippage_bps,
        gap_slippage_enabled=req.gap_slippage_enabled,
    )

    results = engine.run(df)

    sorted_df = df.sort_values("timestamp").reset_index(drop=True)
    initial_close = float(sorted_df.iloc[0]["close"])
    benchmark_shares = req.initial_capital / initial_close

    benchmark_equity_series = sorted_df.set_index("timestamp")["close"] * benchmark_shares
    strategy_equity_series = pd.Series(results["equity_curve"])

    alpha, beta = PerformanceAnalytics.calculate_alpha_beta(
        strategy_equity_series, benchmark_equity_series
    )
    bench_cagr = PerformanceAnalytics.calculate_cagr(benchmark_equity_series) * 100
    bench_total_ret = ((benchmark_equity_series.iloc[-1] / req.initial_capital) - 1.0) * 100
    calmar = PerformanceAnalytics.calculate_calmar_ratio(
        results["cagr"], results["max_drawdown_pct"]
    )
    trade_stats = PerformanceAnalytics.calculate_trade_statistics(engine.trades)

    mc_simulator = MonteCarloSimulator(
        num_simulations=req.num_simulations, ruin_threshold_pct=req.ruin_threshold_pct
    )
    mc_output = mc_simulator.run(engine.trades, req.initial_capital)

    monte_carlo_res = MonteCarloAnalytics(
        num_simulations=mc_output.num_simulations,
        trade_count=mc_output.trade_count,
        median_max_dd_pct=mc_output.median_max_dd_pct,
        p90_max_dd_pct=mc_output.p90_max_dd_pct,
        p95_max_dd_pct=mc_output.p95_max_dd_pct,
        p99_max_dd_pct=mc_output.p99_max_dd_pct,
        risk_of_ruin_pct=mc_output.risk_of_ruin_pct,
        ruin_threshold_pct=mc_output.ruin_threshold_pct,
        var_95_pct=mc_output.var_95_pct,
        cvar_95_pct=mc_output.cvar_95_pct,
        var_99_pct=mc_output.var_99_pct,
        cvar_99_pct=mc_output.cvar_99_pct,
        confidence_bands=[SimulationBandPoint(**b) for b in mc_output.confidence_bands],
    )

    is_intraday = timeframe == "4h"
    time_fmt = "%Y-%m-%d %H:%M" if is_intraday else "%Y-%m-%d"

    ts_strings = pd.to_datetime(df["timestamp"]).dt.strftime(time_fmt).tolist()
    opens = df["open"].astype(float).tolist()
    highs = df["high"].astype(float).tolist()
    lows = df["low"].astype(float).tolist()
    closes = df["close"].astype(float).tolist()
    volumes = df["volume"].astype(float).tolist()

    ohlc_history = [
        OHLCPoint(
            time=timestamp,
            open=open_price,
            high=high_price,
            low=low_price,
            close=close_price,
            volume=volume,
        )
        for timestamp, open_price, high_price, low_price, close_price, volume in zip(
            ts_strings, opens, highs, lows, closes, volumes
        )
    ]

    bench_ts_strings = pd.to_datetime(sorted_df["timestamp"]).dt.strftime(time_fmt).tolist()
    bench_closes = sorted_df["close"].astype(float).tolist()

    benchmark_curve = [
        BenchmarkPoint(
            time=t,
            equity=round(c * benchmark_shares, 2),
            return_pct=round(((c / initial_close) - 1.0) * 100, 2),
        )
        for t, c in zip(bench_ts_strings, bench_closes)
    ]

    equity_points = [
        EquityPoint(
            time=ts.strftime(time_fmt) if isinstance(ts, (pd.Timestamp, datetime)) else str(ts),
            value=float(val),
        )
        for ts, val in results["equity_curve"].items()
    ]

    snapshots = [
        PortfolioSnapshot(**{**snapshot, "time": pd.Timestamp(snapshot["time"]).strftime(time_fmt)})
        for snapshot in results["snapshots"]
    ]
    execution_markers = [
        ExecutionMarker(**{**marker, "time": pd.Timestamp(marker["time"]).strftime(time_fmt)})
        for marker in results["execution_markers"]
    ]
    active_pos = (
        ActivePosition(
            **{
                **results["active_position"],
                "entry_time": pd.Timestamp(results["active_position"]["entry_time"]).strftime(
                    time_fmt
                ),
            }
        )
        if results["active_position"]
        else None
    )

    trade_items = [
        TradeItem(
            trade_id=t.trade_id,
            symbol=t.symbol,
            side=t.side if isinstance(t.side, str) else t.side.value,
            entry_time=t.entry_time.strftime(time_fmt)
            if hasattr(t.entry_time, "strftime")
            else str(t.entry_time),
            exit_time=t.exit_time.strftime(time_fmt)
            if hasattr(t.exit_time, "strftime")
            else str(t.exit_time),
            entry_price=round(float(t.entry_price), 2),
            effective_entry_price=round(
                float(getattr(t, "effective_entry_price", t.entry_price)), 2
            ),
            exit_price=round(float(t.exit_price), 2),
            effective_exit_price=round(float(getattr(t, "effective_exit_price", t.exit_price)), 2),
            quantity=round(float(t.quantity), 4),
            gross_pnl=round(float(getattr(t, "gross_pnl", t.pnl)), 2),
            fees_paid=round(float(getattr(t, "fees_paid", getattr(t, "commission_paid", 0.0))), 2),
            slippage_cost=round(float(getattr(t, "slippage_cost", 0.0)), 2),
            pnl=round(float(t.pnl), 2),
            pnl_pct=round(float(t.pnl_pct), 2),
            exit_reason=t.exit_reason,
        )
        for t in engine.trades
    ]

    return BacktestResponse(
        symbol=req.symbol,
        initial_capital=float(results["initial_capital"]),
        final_equity=float(results["final_equity"]),
        total_return_pct=float(results["total_return_pct"]),
        cagr=float(results["cagr"]),
        sharpe_ratio=float(results["sharpe_ratio"]),
        sortino_ratio=float(results["sortino_ratio"]),
        max_drawdown_pct=float(results["max_drawdown_pct"]),
        total_trades=int(results["total_trades"]),
        total_fees_paid=results.get("total_fees_paid", 0.0),
        total_slippage_paid=results.get("total_slippage_paid", 0.0),
        trade_analytics=TradeAnalytics(**trade_stats),
        benchmark_analytics=BenchmarkAnalytics(
            benchmark_total_return_pct=round(bench_total_ret, 2),
            benchmark_cagr=round(bench_cagr, 2),
            alpha=round(alpha * 100, 2),
            beta=round(beta, 2),
            calmar_ratio=round(calmar, 2),
        ),
        monte_carlo=monte_carlo_res,
        active_position=active_pos,
        execution_markers=execution_markers,
        equity_curve=equity_points,
        benchmark_curve=benchmark_curve,
        ohlc_history=ohlc_history,
        snapshots=snapshots,
        trades=trade_items,
    )


# ==========================================
# 6. Multi-strategy comparison endpoint (A vs B)
# ==========================================
@router.post("/compare", response_model=ComparisonResponse)
async def compare_strategies(req: CompareRequest) -> ComparisonResponse:
    """Compare two strategies under identical market and execution conditions.

    Args:
        req: Shared backtest settings and the two strategy specifications.

    Returns:
        Per-strategy metrics, attribution, and an aligned equity timeline.

    Raises:
        HTTPException: If market data is unavailable or a strategy is invalid.
    """
    storage = StorageManager()
    loader = _DEFAULT_LOADER
    timeframe = getattr(req, "timeframe", "4h") or "4h"

    df = get_market_data(
        symbol=req.symbol,
        start_date=req.start_date,
        end_date=req.end_date,
        timeframe=timeframe,
        storage=storage,
        loader=loader,
    )

    if df.empty:
        raise HTTPException(
            status_code=400, detail=f"No data available for {req.symbol} at {timeframe} resolution"
        )

    # 1. Benchmark Buy & Hold
    sorted_df = df.sort_values("timestamp").reset_index(drop=True)
    initial_close = float(sorted_df.iloc[0]["close"])
    benchmark_shares = req.initial_capital / initial_close
    is_intraday = timeframe == "4h"
    time_fmt = "%Y-%m-%d %H:%M" if is_intraday else "%Y-%m-%d"

    bench_equity_series = sorted_df.set_index("timestamp")["close"] * benchmark_shares
    bench_ts_strings = pd.to_datetime(sorted_df["timestamp"]).dt.strftime(time_fmt).tolist()

    # 2. Run Strategy A
    try:
        strat_a_obj = StrategyRegistry.create(
            req.strategy_a.strategy_id, **req.strategy_a.strategy_params
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Strategy A: {exc}") from exc

    engine_a = BacktestEngine(
        strategy=strat_a_obj,
        initial_capital=req.initial_capital,
        risk_fraction=req.risk_fraction,
        atr_multiplier_sl=req.atr_multiplier_sl,
        atr_multiplier_tp=req.atr_multiplier_tp,
        commission_bps=req.commission_bps,
        commission_fixed=req.commission_fixed,
        slippage_bps=req.slippage_bps,
        gap_slippage_enabled=req.gap_slippage_enabled,
    )
    res_a = engine_a.run(df)
    strat_a_equity = pd.Series(res_a["equity_curve"])
    alpha_a, beta_a = PerformanceAnalytics.calculate_alpha_beta(strat_a_equity, bench_equity_series)
    t_stats_a = PerformanceAnalytics.calculate_trade_statistics(engine_a.trades)
    frictions_a = float(res_a.get("total_fees_paid", 0.0) + res_a.get("total_slippage_paid", 0.0))

    metrics_a = StrategyCompareMetrics(
        strategy_id=req.strategy_a.strategy_id,
        strategy_name=req.strategy_a.name or req.strategy_a.strategy_id,
        total_return_pct=round(res_a["total_return_pct"], 2),
        cagr=round(res_a["cagr"], 2),
        sharpe_ratio=round(res_a["sharpe_ratio"], 2),
        sortino_ratio=round(res_a["sortino_ratio"], 2),
        max_drawdown_pct=round(res_a["max_drawdown_pct"], 2),
        alpha=round(alpha_a * 100, 2),
        beta=round(beta_a, 2),
        win_rate_pct=round(t_stats_a["win_rate_pct"], 1),
        profit_factor=round(t_stats_a["profit_factor"], 2),
        total_trades=len(engine_a.trades),
        total_frictions=round(frictions_a, 2),
    )

    # 3. Run Strategy B
    try:
        strat_b_obj = StrategyRegistry.create(
            req.strategy_b.strategy_id, **req.strategy_b.strategy_params
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Strategy B: {exc}") from exc

    engine_b = BacktestEngine(
        strategy=strat_b_obj,
        initial_capital=req.initial_capital,
        risk_fraction=req.risk_fraction,
        atr_multiplier_sl=req.atr_multiplier_sl,
        atr_multiplier_tp=req.atr_multiplier_tp,
        commission_bps=req.commission_bps,
        commission_fixed=req.commission_fixed,
        slippage_bps=req.slippage_bps,
        gap_slippage_enabled=req.gap_slippage_enabled,
    )
    res_b = engine_b.run(df)
    strat_b_equity = pd.Series(res_b["equity_curve"])
    alpha_b, beta_b = PerformanceAnalytics.calculate_alpha_beta(strat_b_equity, bench_equity_series)
    t_stats_b = PerformanceAnalytics.calculate_trade_statistics(engine_b.trades)
    frictions_b = float(res_b.get("total_fees_paid", 0.0) + res_b.get("total_slippage_paid", 0.0))

    metrics_b = StrategyCompareMetrics(
        strategy_id=req.strategy_b.strategy_id,
        strategy_name=req.strategy_b.name or req.strategy_b.strategy_id,
        total_return_pct=round(res_b["total_return_pct"], 2),
        cagr=round(res_b["cagr"], 2),
        sharpe_ratio=round(res_b["sharpe_ratio"], 2),
        sortino_ratio=round(res_b["sortino_ratio"], 2),
        max_drawdown_pct=round(res_b["max_drawdown_pct"], 2),
        alpha=round(alpha_b * 100, 2),
        beta=round(beta_b, 2),
        win_rate_pct=round(t_stats_b["win_rate_pct"], 1),
        profit_factor=round(t_stats_b["profit_factor"], 2),
        total_trades=len(engine_b.trades),
        total_frictions=round(frictions_b, 2),
    )

    # 4. Build the aligned comparison timeline
    timeline: list[TimelinePoint] = []
    a_curve_map = {
        (ts.strftime(time_fmt) if isinstance(ts, (pd.Timestamp, datetime)) else str(ts)): float(val)
        for ts, val in res_a["equity_curve"].items()
    }
    b_curve_map = {
        (ts.strftime(time_fmt) if isinstance(ts, (pd.Timestamp, datetime)) else str(ts)): float(val)
        for ts, val in res_b["equity_curve"].items()
    }

    for t_str, b_eq in zip(bench_ts_strings, bench_equity_series):
        timeline.append(
            TimelinePoint(
                time=t_str,
                equity_a=round(a_curve_map.get(t_str, req.initial_capital), 2),
                equity_b=round(b_curve_map.get(t_str, req.initial_capital), 2),
                benchmark_equity=round(float(b_eq), 2),
            )
        )

    # 5. Calculate attribution and select the winner
    winner = "A" if metrics_a.sharpe_ratio >= metrics_b.sharpe_ratio else "B"
    attribution = AttributionSummary(
        outperforming_strategy=winner,
        delta_cagr=round(metrics_a.cagr - metrics_b.cagr, 2),
        delta_sharpe=round(metrics_a.sharpe_ratio - metrics_b.sharpe_ratio, 2),
        delta_alpha=round(metrics_a.alpha - metrics_b.alpha, 2),
        delta_return_pct=round(metrics_a.total_return_pct - metrics_b.total_return_pct, 2),
        delta_max_dd=round(metrics_a.max_drawdown_pct - metrics_b.max_drawdown_pct, 2),
        delta_win_rate=round(metrics_a.win_rate_pct - metrics_b.win_rate_pct, 1),
    )

    return ComparisonResponse(
        symbol=req.symbol,
        start_date=req.start_date,
        end_date=req.end_date,
        strategy_a=metrics_a,
        strategy_b=metrics_b,
        attribution=attribution,
        timeline=timeline,
    )


# ==========================================
# 7. OOS audit endpoint
# ==========================================
@router.post("/oos-audit", response_model=OOSAuditResponse)
async def audit_oos_split(req: OOSAuditRequest) -> OOSAuditResponse:
    """Audit the out-of-sample portion of an equity curve.

    Args:
        req: Equity curve, trades, and split ratio to audit.

    Returns:
        In-sample and out-of-sample metrics with a validation status.

    Raises:
        HTTPException: If the equity curve has fewer than ten points.
    """
    if len(req.equity_curve) < 10:
        raise HTTPException(
            status_code=400, detail="Insufficient equity points to calculate the OOS split."
        )

    split_idx = int(len(req.equity_curve) * req.split_ratio)
    split_date = req.equity_curve[split_idx].time

    is_equity = pd.Series(
        [p.value for p in req.equity_curve[:split_idx]],
        index=pd.to_datetime([p.time for p in req.equity_curve[:split_idx]]),
    )
    oos_equity = pd.Series(
        [p.value for p in req.equity_curve[split_idx:]],
        index=pd.to_datetime([p.time for p in req.equity_curve[split_idx:]]),
    )

    sharpe_is = PerformanceAnalytics.calculate_sharpe_ratio(is_equity)
    sharpe_oos = PerformanceAnalytics.calculate_sharpe_ratio(oos_equity)

    ret_is = ((is_equity.iloc[-1] / is_equity.iloc[0]) - 1.0) * 100 if len(is_equity) > 0 else 0.0
    ret_oos = (
        ((oos_equity.iloc[-1] / oos_equity.iloc[0]) - 1.0) * 100 if len(oos_equity) > 0 else 0.0
    )

    dd_is, _ = PerformanceAnalytics.calculate_max_drawdown(is_equity)
    dd_oos, _ = PerformanceAnalytics.calculate_max_drawdown(oos_equity)

    wfer = round(sharpe_oos / sharpe_is, 2) if sharpe_is > 0 else (1.0 if sharpe_oos > 0 else 0.0)

    oos_trades = [t for t in req.trades if str(t.entry_time) >= split_date]
    wins = [t.pnl for t in oos_trades if t.pnl > 0]
    losses = [abs(t.pnl) for t in oos_trades if t.pnl < 0]
    pf_oos = sum(wins) / sum(losses) if sum(losses) > 0 else (99.99 if sum(wins) > 0 else 0.0)

    if wfer >= 0.50 and pf_oos >= 1.0 and ret_oos > 0:
        status = "ROBUST"
    elif ret_oos > 0 and pf_oos >= 1.0:
        status = "MODERATE"
    else:
        status = "OVERFITTED"

    return OOSAuditResponse(
        split_date=split_date,
        is_trades_count=len(req.trades) - len(oos_trades),
        oos_trades_count=len(oos_trades),
        sharpe_is=round(sharpe_is, 2),
        sharpe_oos=round(sharpe_oos, 2),
        wfer=wfer,
        total_return_is_pct=round(ret_is, 2),
        total_return_oos_pct=round(ret_oos, 2),
        max_dd_is_pct=round(dd_is * 100, 2),
        max_dd_oos_pct=round(dd_oos * 100, 2),
        profit_factor_oos=round(pf_oos, 2),
        validation_status=status,
    )
