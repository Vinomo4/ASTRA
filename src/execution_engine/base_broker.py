from __future__ import annotations

from abc import ABC, abstractmethod

from src.core.events import FillEvent, OrderEvent


class BaseBroker(ABC):
    @abstractmethod
    def execute_order(self, order: OrderEvent, current_price: float) -> FillEvent:
        raise NotImplementedError
