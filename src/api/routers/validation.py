# src/api/routers/validation.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.schemas import WalkForwardRequest, WalkForwardResponse
from src.backtester.walk_forward import WalkForwardEngine

router = APIRouter()


@router.post("/walk-forward", response_model=WalkForwardResponse)
async def run_walk_forward_validation(req: WalkForwardRequest) -> WalkForwardResponse:
    """
    Executes an In-Sample / Out-of-Sample Walk-Forward train-test split
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
            timeframe=req.timeframe,
            train_ratio=req.train_ratio,
            initial_capital=req.initial_capital,
            risk_fraction=req.risk_fraction,
            atr_multiplier_sl=req.atr_multiplier_sl,
            atr_multiplier_tp=req.atr_multiplier_tp,
            commission_bps=req.commission_bps,
            commission_fixed=req.commission_fixed,
            slippage_bps=req.slippage_bps,
            gap_slippage_enabled=req.gap_slippage_enabled,
        )
        return WalkForwardResponse(**results)
    except (ValueError, KeyError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
