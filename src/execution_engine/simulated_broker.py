from __future__ import annotations

from src.core.events import FillEvent, OrderEvent
from src.execution_engine.slippage_models import BaseSlippageModel, PercentageSlippageModel


class SimulatedBroker:
    def __init__(
        self,
        commission_rate: float = 0.0005,
        slippage_model: BaseSlippageModel | None = None,
    ) -> None:
        self.commission_rate = commission_rate
        self.slippage_model = slippage_model or PercentageSlippageModel()

    def execute_order(self, order: OrderEvent, market_price: float) -> FillEvent:
        fill_price = self.slippage_model.calculate_execution_price(
            market_price, order.side, order.quantity
        )
        notional_value = fill_price * order.quantity
        commission = notional_value * self.commission_rate
        slippage_cost = abs(fill_price - market_price) * order.quantity
        return FillEvent(
            timestamp=order.timestamp,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            fill_price=fill_price,
            commission=commission,
            slippage=slippage_cost,
        )
