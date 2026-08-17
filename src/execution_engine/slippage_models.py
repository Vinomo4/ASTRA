from __future__ import annotations

from abc import ABC, abstractmethod

from src.core.constants import OrderSide


class BaseSlippageModel(ABC):
    @abstractmethod
    def calculate_execution_price(
        self, base_price: float, side: OrderSide, quantity: float
    ) -> float:
        raise NotImplementedError


class PercentageSlippageModel(BaseSlippageModel):
    def __init__(self, slippage_pct: float = 0.0002) -> None:
        self.slippage_pct = slippage_pct

    def calculate_execution_price(
        self, base_price: float, side: OrderSide, quantity: float
    ) -> float:
        if side == OrderSide.BUY:
            return base_price * (1.0 + self.slippage_pct)
        return base_price * (1.0 - self.slippage_pct)


def fixed_slippage(price: float, slippage: float) -> float:
    return price * (1.0 + slippage)


def volume_impact_slippage(price: float, quantity: float, average_volume: float) -> float:
    if average_volume <= 0:
        return price
    impact = min(0.05, quantity / average_volume * 0.01)
    return price * (1.0 + impact)
