"""Expose strategy discovery and preset management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.schemas import (
    StrategyListResponse,
    StrategyPresetCreate,
    StrategyPresetListResponse,
    StrategyPresetResponse,
)
from src.data_engine.storage_manager import StorageManager
from src.strategies import StrategyRegistry

router = APIRouter()


@router.get("/strategies", response_model=StrategyListResponse)
async def list_available_strategies() -> StrategyListResponse:
    """List metadata and parameter schemas for registered strategies.

    Returns:
        Metadata for every registered strategy.
    """
    strategies = StrategyRegistry.list_strategies()
    return StrategyListResponse(strategies=[s.model_dump() for s in strategies])


@router.get("/presets", response_model=StrategyPresetListResponse)
async def list_strategy_presets() -> StrategyPresetListResponse:
    """List saved strategy configuration presets.

    Returns:
        All persisted strategy presets.
    """
    storage = StorageManager()
    presets = storage.list_strategy_presets()
    return StrategyPresetListResponse(presets=[StrategyPresetResponse(**p) for p in presets])


@router.post("/presets", response_model=StrategyPresetResponse)
async def save_strategy_preset(req: StrategyPresetCreate) -> StrategyPresetResponse:
    """Create or update a named strategy preset.

    Args:
        req: Strategy and execution settings to persist.

    Returns:
        The persisted strategy preset.

    Raises:
        HTTPException: If the requested strategy is not registered.
    """
    if req.strategy_id not in StrategyRegistry._registry:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot save preset for unregistered strategy '{req.strategy_id}'.",
        )

    storage = StorageManager()
    saved = storage.save_strategy_preset(
        preset_name=req.preset_name,
        strategy_id=req.strategy_id,
        strategy_params=req.strategy_params,
        risk_fraction=req.risk_fraction,
        atr_multiplier_sl=req.atr_multiplier_sl,
        atr_multiplier_tp=req.atr_multiplier_tp,
        commission_bps=req.commission_bps,
        commission_fixed=req.commission_fixed,
        slippage_bps=req.slippage_bps,
        gap_slippage_enabled=req.gap_slippage_enabled,
        description=req.description,
    )
    return StrategyPresetResponse(**saved)


@router.delete("/presets/{preset_name}")
async def delete_strategy_preset(preset_name: str) -> dict[str, str]:
    """Delete a saved strategy preset.

    Args:
        preset_name: Name of the preset to delete.

    Returns:
        A confirmation message.

    Raises:
        HTTPException: If the requested preset does not exist.
    """
    storage = StorageManager()
    existing = storage.get_strategy_preset(preset_name)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_name}' not found.")

    storage.delete_strategy_preset(preset_name)
    return {"message": f"Preset '{preset_name}' successfully deleted."}
