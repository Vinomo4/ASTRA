# src/api/routers/simulation.py
from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, HTTPException

from src.analytics.metrics import PerformanceAnalytics
from src.analytics.monte_carlo import MonteCarloSimulator
from src.api.schemas.backtest_schemas import (
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
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader
from src.strategies import StrategyRegistry

router = APIRouter()


@router.post("/run", response_model=BacktestResponse)
async def run_backtest(req: BacktestRequest) -> BacktestResponse:
    storage = StorageManager()

    # 1. Fetch / Load Market Data
    df = storage.load_ohlcv(req.symbol, req.start_date, req.end_date)
    if df.empty:
        loader = YFinanceLoader()
        try:
            df = loader.fetch_ohlcv(req.symbol, req.start_date, req.end_date)
            storage.save_ohlcv(df)
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"Failed to fetch market data: {exc}"
            ) from exc

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No market data found for symbol {req.symbol} in the requested range.",
        )

    # 2. Polymorphic Strategy Instantiation
    strategy_params = dict(req.strategy_params)
    if "fast_ema" not in strategy_params and req.fast_ema is not None:
        strategy_params["fast_ema"] = req.fast_ema
    if "slow_ema" not in strategy_params and req.slow_ema is not None:
        strategy_params["slow_ema"] = req.slow_ema

    try:
        strategy = StrategyRegistry.create(req.strategy_id, **strategy_params)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid strategy parameters: {exc}") from exc

    # 3. Run Backtest Engine
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

    # 4. Compute Benchmark Curve
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

    # 5. Monte Carlo Resilience
    mc_simulator = MonteCarloSimulator(
        num_simulations=req.num_simulations,
        ruin_threshold_pct=req.ruin_threshold_pct,
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

    benchmark_curve = [
        BenchmarkPoint(
            time=row["timestamp"].strftime("%Y-%m-%d")
            if hasattr(row["timestamp"], "strftime")
            else str(row["timestamp"]),
            equity=round(float(row["close"] * benchmark_shares), 2),
            return_pct=round(float((row["close"] / initial_close - 1.0) * 100), 2),
        )
        for _, row in sorted_df.iterrows()
    ]

    ohlc_history = [
        OHLCPoint(
            time=row["timestamp"].strftime("%Y-%m-%d")
            if hasattr(row["timestamp"], "strftime")
            else str(row["timestamp"]),
            open=round(float(row["open"]), 2),
            high=round(float(row["high"]), 2),
            low=round(float(row["low"]), 2),
            close=round(float(row["close"]), 2),
            volume=round(float(row["volume"]), 2),
        )
        for _, row in sorted_df.iterrows()
    ]

    equity_points = [
        EquityPoint(
            time=ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts),
            value=float(val),
        )
        for ts, val in results["equity_curve"].items()
    ]

    snapshots = [PortfolioSnapshot(**snap) for snap in results["snapshots"]]
    execution_markers = [ExecutionMarker(**marker) for marker in results["execution_markers"]]
    active_pos = (
        ActivePosition(**results["active_position"]) if results["active_position"] else None
    )

    trade_items = [
        TradeItem(
            trade_id=t.trade_id,
            symbol=t.symbol,
            side=t.side if isinstance(t.side, str) else t.side.value,
            entry_time=t.entry_time.strftime("%Y-%m-%d")
            if hasattr(t.entry_time, "strftime")
            else str(t.entry_time),
            exit_time=t.exit_time.strftime("%Y-%m-%d")
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
