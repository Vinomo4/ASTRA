"""Expose the strategy comparison API endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.schemas import ComparisonRequest, ComparisonResponse
from src.backtester.comparator import ComparatorEngine

router = APIRouter()


@router.post("/compare", response_model=ComparisonResponse)
async def run_strategy_comparison(req: ComparisonRequest) -> ComparisonResponse:
    """Compare two strategies under identical backtest conditions.

    Args:
        req: Market, execution, and strategy comparison settings.

    Returns:
        Metrics, attribution, and timeline data for both strategies.

    Raises:
        HTTPException: If the comparison inputs are invalid or execution fails.
    """
    engine = ComparatorEngine()
    try:
        results = engine.run_comparison(
            symbol=req.symbol,
            start_date=req.start_date,
            end_date=req.end_date,
            timeframe=req.timeframe,
            strategy_a_id=req.strategy_a.strategy_id,
            strategy_a_params=req.strategy_a.strategy_params,
            strategy_a_name=req.strategy_a.name,
            strategy_b_id=req.strategy_b.strategy_id,
            strategy_b_params=req.strategy_b.strategy_params,
            strategy_b_name=req.strategy_b.name,
            initial_capital=req.initial_capital,
            risk_fraction=req.risk_fraction,
            atr_multiplier_sl=req.atr_multiplier_sl,
            atr_multiplier_tp=req.atr_multiplier_tp,
            commission_bps=req.commission_bps,
            commission_fixed=req.commission_fixed,
            slippage_bps=req.slippage_bps,
            gap_slippage_enabled=req.gap_slippage_enabled,
        )
        return ComparisonResponse(**results)
    except (ValueError, KeyError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
