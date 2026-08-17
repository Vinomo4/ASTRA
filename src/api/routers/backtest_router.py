from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.schemas.backtest_schemas import BacktestRequest, BacktestResponse
from src.backtester.event_engine import BacktestEngine
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader
from src.strategies.trend_following import TrendFollowingStrategy

router = APIRouter(prefix="/api/backtest", tags=["Backtest"])


@router.post("/run", response_model=BacktestResponse)
async def run_backtest(req: BacktestRequest) -> BacktestResponse:
    storage = StorageManager()

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

    strategy = TrendFollowingStrategy(fast_ema=req.fast_ema, slow_ema=req.slow_ema)
    engine = BacktestEngine(
        strategy=strategy,
        initial_capital=req.initial_capital,
        risk_fraction=req.risk_fraction,
    )

    results = engine.run(df)
    results["symbol"] = req.symbol
    return BacktestResponse(**results)
