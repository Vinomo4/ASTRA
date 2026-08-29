"""Expose the rolling walk-forward validation endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.schemas.walk_forward import WalkForwardRequest, WalkForwardResponse
from src.backtester.walk_forward import WalkForwardEngine

router = APIRouter()


@router.post("/walk-forward", response_model=WalkForwardResponse)
async def run_walk_forward_validation(req: WalkForwardRequest) -> WalkForwardResponse:
    """Run expanding rolling walk-forward validation.

    The validation computes results across multiple windows and derives the
    walk-forward efficiency ratio.

    Args:
        req: Market, strategy, window, risk, and execution settings.

    Returns:
        Aggregated validation metrics and out-of-sample equity data.

    Raises:
        HTTPException: If validation inputs are invalid or execution fails.
    """
    engine = WalkForwardEngine()
    try:
        results = engine.run_rolling_walk_forward(
            symbol=req.symbol,
            start_date=req.start_date,
            end_date=req.end_date,
            strategy_id=req.strategy_id,
            strategy_params=req.strategy_params,
            timeframe=req.timeframe,
            initial_capital=req.initial_capital,
            train_duration_months=req.train_duration_months,
            test_step_months=req.test_step_months,
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
