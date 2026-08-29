"""Enumerated values shared across the trading system."""

from enum import StrEnum


class OrderType(StrEnum):
    """Identify supported order execution types."""

    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"


class OrderSide(StrEnum):
    """Identify whether an order buys or sells an asset."""

    BUY = "BUY"
    SELL = "SELL"


class OrderStatus(StrEnum):
    """Identify the current lifecycle state of an order."""

    PENDING = "PENDING"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class SignalType(StrEnum):
    """Identify the action requested by a strategy signal."""

    LONG = "LONG"
    SHORT = "SHORT"
    EXIT = "EXIT"
    HOLD = "HOLD"


class AssetClass(StrEnum):
    """Identify a supported financial asset category."""

    EQUITY = "EQUITY"
    CRYPTO = "CRYPTO"
    FX = "FX"
