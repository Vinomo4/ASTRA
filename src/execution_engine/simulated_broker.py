# src/execution_engine/simulated_broker.py
from __future__ import annotations

from dataclasses import dataclass

from src.core.constants import OrderSide
from src.core.events import OrderEvent


@dataclass
class OrderFillEvent:
    timestamp: object
    symbol: str
    side: OrderSide
    quantity: float
    nominal_price: float  # Precio de mercado antes de fricción
    fill_price: float  # Precio efectivo con slippage
    commission: float  # Comisión total (fija + variable)
    slippage: float  # Coste monetario del deslizamiento


class SimulatedBroker:
    def __init__(
        self,
        commission_bps: float = 5.0,
        commission_fixed: float = 0.0,
        slippage_bps: float = 2.0,
    ) -> None:
        self.commission_bps = commission_bps / 10_000.0  # 5 bps = 0.0005
        self.commission_fixed = commission_fixed
        self.slippage_rate = slippage_bps / 10_000.0  # 2 bps = 0.0002

    def execute_order(self, order: OrderEvent, market_price: float) -> OrderFillEvent:
        # 1. Aplicar slippage adverso según la dirección
        if order.side == OrderSide.BUY:
            fill_price = market_price * (1.0 + self.slippage_rate)
            slippage_cost = (fill_price - market_price) * order.quantity
        else:
            fill_price = market_price * (1.0 - self.slippage_rate)
            slippage_cost = (market_price - fill_price) * order.quantity

        # 2. Calcular comisión fija + variable sobre el valor nocional
        notional_value = fill_price * order.quantity
        commission = self.commission_fixed + (notional_value * self.commission_bps)

        return OrderFillEvent(
            timestamp=order.timestamp,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            nominal_price=market_price,
            fill_price=fill_price,
            commission=commission,
            slippage=slippage_cost,
        )
