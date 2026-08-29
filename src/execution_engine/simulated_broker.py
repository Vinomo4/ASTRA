"""Simulate order execution with commission and slippage."""

from __future__ import annotations

from dataclasses import dataclass

from src.core.constants import OrderSide
from src.core.events import OrderEvent


@dataclass
class OrderFillEvent:
    """Describe the result of a simulated order execution.

    Attributes:
        timestamp: Timestamp copied from the submitted order.
        symbol: Symbol of the executed order.
        side: Buy or sell side of the executed order.
        quantity: Number of units filled.
        nominal_price: Market price before transaction costs.
        fill_price: Effective execution price after slippage.
        commission: Total fixed and variable commission.
        slippage: Monetary cost of adverse slippage.
    """

    timestamp: object
    symbol: str
    side: OrderSide
    quantity: float
    nominal_price: float  # Market price before transaction costs.
    fill_price: float  # Effective execution price after slippage.
    commission: float  # Total fixed and variable commission.
    slippage: float  # Monetary cost of adverse slippage.


class SimulatedBroker:
    """Simulate order fills with commission and adverse slippage."""

    def __init__(
        self, commission_bps: float = 5.0, commission_fixed: float = 0.0, slippage_bps: float = 2.0
    ) -> None:
        """Initialize transaction-cost settings.

        Args:
            commission_bps: Variable commission in basis points.
            commission_fixed: Fixed commission charged per order.
            slippage_bps: Adverse execution slippage in basis points.
        """
        self.commission_bps = commission_bps / 10_000.0  # 5 bps = 0.0005
        self.commission_fixed = commission_fixed
        self.slippage_rate = slippage_bps / 10_000.0  # 2 bps = 0.0002

    def execute_order(self, order: OrderEvent, market_price: float) -> OrderFillEvent:
        """Execute an order using the configured transaction costs.

        Args:
            order: Order request to fill.
            market_price: Unadjusted market price at execution time.

        Returns:
            A fill event containing execution price and transaction costs.
        """
        # Apply adverse slippage based on the order direction.
        if order.side == OrderSide.BUY:
            fill_price = market_price * (1.0 + self.slippage_rate)
            slippage_cost = (fill_price - market_price) * order.quantity
        else:
            fill_price = market_price * (1.0 - self.slippage_rate)
            slippage_cost = (market_price - fill_price) * order.quantity

        # Calculate fixed and variable commission on the notional value.
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
