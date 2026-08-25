# src/api/schemas/presets.py
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class StrategyPresetCreate(BaseModel):
    preset_name: str = Field(..., min_length=2, max_length=60, description="Unique preset name")
    strategy_id: str = Field(..., description="Target strategy identifier")
    timeframe: str = Field(default="1d", description="Bar interval: 15m, 1h, 4h, 1d, 1wk")
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    risk_fraction: float = Field(default=0.01, ge=0.001, le=0.2)
    atr_multiplier_sl: float = Field(default=2.0, ge=0.5, le=10.0)
    atr_multiplier_tp: float = Field(default=4.0, ge=0.5, le=20.0)
    commission_bps: float = Field(default=5.0, ge=0.0)
    commission_fixed: float = Field(default=0.0, ge=0.0)
    slippage_bps: float = Field(default=2.0, ge=0.0)
    gap_slippage_enabled: bool = True
    description: str = Field(default="", max_length=255)


class StrategyPresetResponse(StrategyPresetCreate):
    updated_at: str


class StrategyPresetListResponse(BaseModel):
    presets: list[StrategyPresetResponse]
