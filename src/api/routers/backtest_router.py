# src/api/routers/backtest_router.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.schemas.backtest_schemas import (
    BacktestRequest,
    BacktestResponse,
    EquityPoint,
    TradeItem,
)
from src.backtester.event_engine import BacktestEngine
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader
from src.strategies.trend_following import TrendFollowingStrategy

router = APIRouter(prefix="/api/backtest", tags=["Backtest"])


@router.post("/run", response_model=BacktestResponse)
async def run_backtest(req: BacktestRequest) -> BacktestResponse:
    storage = StorageManager()

    # 1. Load from DuckDB or fetch from YFinance on cache miss
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

    # 2. Execute Strategy and Engine Simulation
    strategy = TrendFollowingStrategy(fast_ema=req.fast_ema, slow_ema=req.slow_ema)
    engine = BacktestEngine(
        strategy=strategy,
        initial_capital=req.initial_capital,
        risk_fraction=req.risk_fraction,
    )

    results = engine.run(df)

    # 3. Transform equity curve into chronological point list
    equity_points = [
        EquityPoint(
            time=ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts),
            value=float(val),
        )
        for ts, val in results["equity_curve"].items()
    ]

    # 4. Transform trade records into response items
    trade_items = [
        TradeItem(
            trade_id=t.trade_id,
            symbol=t.symbol,
            side=t.side,
            entry_time=t.entry_time.strftime("%Y-%m-%d")
            if hasattr(t.entry_time, "strftime")
            else str(t.entry_time),
            exit_time=t.exit_time.strftime("%Y-%m-%d")
            if hasattr(t.exit_time, "strftime")
            else str(t.exit_time),
            entry_price=round(float(t.entry_price), 2),
            exit_price=round(float(t.exit_price), 2),
            quantity=round(float(t.quantity), 4),
            pnl=round(float(t.pnl), 2),
            pnl_pct=round(float(t.pnl_pct * 100), 2),
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
        equity_curve=equity_points,
        trades=trade_items,
    )
