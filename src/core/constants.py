from enum import StrEnum


class OrderType(StrEnum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"


class OrderSide(StrEnum):
    BUY = "BUY"
    SELL = "SELL"


class OrderStatus(StrEnum):
    PENDING = "PENDING"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class SignalType(StrEnum):
    LONG = "LONG"
    SHORT = "SHORT"
    EXIT = "EXIT"
    HOLD = "HOLD"


class AssetClass(StrEnum):
    EQUITY = "EQUITY"
    CRYPTO = "CRYPTO"
    FX = "FX"
