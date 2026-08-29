"""Immutable events exchanged by strategies and backtest components."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from src.core.constants import OrderSide, OrderType, SignalType


@dataclass(frozen=True, slots=True)
class Event:
    """Provide the base type for events processed by the event engine."""

    pass


@dataclass(frozen=True, slots=True)
class MarketDataEvent(Event):
    """Represent one point-in-time market bar.

    Attributes:
        timestamp: Observation time of the bar.
        symbol: Traded instrument identifier.
        open: Opening price.
        high: Highest price.
        low: Lowest price.
        close: Closing price.
        volume: Traded volume.
    """

    timestamp: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass(frozen=True, slots=True)
class SignalEvent(Event):
    """Represent a strategy's requested trading action.

    Attributes:
        timestamp: Time at which the signal was generated.
        symbol: Instrument targeted by the signal.
        signal_type: Requested position action.
        strength: Relative signal strength used for sizing.
        strategy_id: Identifier of the originating strategy.
        stop_loss: Optional stop-loss price.
        take_profit: Optional take-profit price.
    """

    timestamp: datetime
    symbol: str
    signal_type: SignalType
    strength: float = 1.0
    strategy_id: str = "default_strategy"
    stop_loss: float | None = None
    take_profit: float | None = None


@dataclass(frozen=True, slots=True)
class OrderEvent(Event):
    """Represent an order submitted for execution.

    Attributes:
        timestamp: Time at which the order was submitted.
        symbol: Instrument to trade.
        order_type: Requested execution type.
        side: Buy or sell side.
        quantity: Number of units to execute.
        stop_loss: Optional stop-loss price for the resulting position.
        take_profit: Optional take-profit price for the resulting position.
        target_price: Optional reference price used by the broker.
        price_limit: Optional limit-order price.
        stop_price: Optional stop-order trigger price.
    """

    timestamp: datetime
    symbol: str
    order_type: OrderType
    side: OrderSide
    quantity: float
    stop_loss: float | None = None
    take_profit: float | None = None
    target_price: float | None = None
    price_limit: float | None = None
    stop_price: float | None = None


@dataclass(frozen=True, slots=True)
class FillEvent(Event):
    """Represent the executed result of an order.

    Attributes:
        timestamp: Execution time.
        symbol: Executed instrument.
        side: Executed buy or sell side.
        quantity: Number of units executed.
        fill_price: Effective execution price.
        commission: Commission charged for the fill.
        slippage: Per-unit difference from the reference price.
        order_type: Execution type of the filled order.
    """

    timestamp: datetime
    symbol: str
    side: OrderSide
    quantity: float
    fill_price: float
    commission: float = 0.0
    slippage: float = 0.0
    order_type: OrderType = OrderType.MARKET


__all__ = ["Event", "FillEvent", "MarketDataEvent", "OrderEvent", "SignalEvent"]
