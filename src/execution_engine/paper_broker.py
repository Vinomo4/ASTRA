from __future__ import annotations

from src.core.events import FillEvent, OrderEvent
from src.execution_engine.base_broker import BaseBroker


class PaperBroker(BaseBroker):
    def execute_order(self, order: OrderEvent, current_price: float) -> FillEvent:
        raise RuntimeError("Paper broker integration not configured")
