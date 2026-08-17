# src/core/events.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from src.core.constants import OrderSide, OrderType, SignalType


@dataclass(frozen=True, slots=True)
class Event:
    pass


@dataclass(frozen=True, slots=True)
class MarketDataEvent(Event):
    timestamp: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass(frozen=True, slots=True)
class SignalEvent(Event):
    timestamp: datetime
    symbol: str
    signal_type: SignalType
    strength: float = 1.0
    strategy_id: str = "default_strategy"
    stop_loss: float | None = None
    take_profit: float | None = None


@dataclass(frozen=True, slots=True)
class OrderEvent(Event):
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
    timestamp: datetime
    symbol: str
    side: OrderSide
    quantity: float
    fill_price: float
    commission: float = 0.0
    slippage: float = 0.0
    order_type: OrderType = OrderType.MARKET


__all__ = [
    "Event",
    "MarketDataEvent",
    "SignalEvent",
    "OrderEvent",
    "FillEvent",
]
