from __future__ import annotations

from src.core.constants import OrderSide, OrderType
from src.core.events import OrderEvent, SignalEvent


class VolatilityPositionSizer:
    def __init__(
        self,
        risk_fraction: float = 0.01,
        atr_multiplier: float = 2.0,
        risk_per_trade: float | None = None,
    ) -> None:
        self.risk_fraction = risk_fraction if risk_per_trade is None else risk_per_trade
        self.atr_multiplier = atr_multiplier

    def calculate_order_quantity(
        self, current_equity: float, current_price: float, current_atr: float
    ) -> float:
        if current_atr <= 0 or current_price <= 0 or current_equity <= 0:
            return 0.0

        risk_capital = current_equity * self.risk_fraction
        stop_distance = current_atr * self.atr_multiplier
        target_quantity = risk_capital / stop_distance
        max_affordable_quantity = current_equity / current_price
        return min(target_quantity, max_affordable_quantity)

    def size_order(
        self,
        signal: SignalEvent,
        equity: float,
        current_price: float,
        current_atr: float,
    ) -> OrderEvent | None:
        if current_price <= 0 or current_atr <= 0 or equity <= 0:
            return None

        risk_amount = equity * self.risk_fraction
        stop_distance = current_atr * self.atr_multiplier
        target_quantity = risk_amount / stop_distance

        max_affordable_quantity = equity / current_price
        final_quantity = min(target_quantity, max_affordable_quantity)

        if final_quantity <= 0:
            return None

        side = OrderSide.BUY if signal.signal_type == "LONG" else OrderSide.SELL

        return OrderEvent(
            timestamp=signal.timestamp,
            symbol=signal.symbol,
            order_type=OrderType.MARKET,
            side=side,
            quantity=final_quantity,
            stop_price=current_price - stop_distance
            if side == OrderSide.BUY
            else current_price + stop_distance,
        )
