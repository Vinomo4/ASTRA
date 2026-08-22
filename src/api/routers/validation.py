# src/api/routers/validation.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.schemas.backtest_schemas import WalkForwardRequest, WalkForwardResponse
from src.backtester.walk_forward import WalkForwardEngine

router = APIRouter()


@router.post("/walk-forward", response_model=WalkForwardResponse)
async def run_walk_forward_validation(req: WalkForwardRequest) -> WalkForwardResponse:
    """
    Executes an In-Sample vs. Out-of-Sample chronological validation split
    and computes the Walk-Forward Efficiency Ratio (WFER) for overfitting diagnostics.
    """
    engine = WalkForwardEngine()
    try:
        results = engine.run_split_validation(
            symbol=req.symbol,
            start_date=req.start_date,
            end_date=req.end_date,
            strategy_id=req.strategy_id,
            strategy_params=req.strategy_params,
            initial_capital=req.initial_capital,
            train_ratio=req.train_ratio,
            risk_fraction=req.risk_fraction,
            atr_multiplier_sl=req.atr_multiplier_sl,
            atr_multiplier_tp=req.atr_multiplier_tp,
            commission_bps=req.commission_bps,
            commission_fixed=req.commission_fixed,
            slippage_bps=req.slippage_bps,
            gap_slippage_enabled=req.gap_slippage_enabled,
        )
        return WalkForwardResponse(**results)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
