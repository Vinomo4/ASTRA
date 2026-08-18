# src/core/models.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4

from pydantic import BaseModel, Field

from src.core.constants import OrderSide, OrderType, SignalType


@dataclass(slots=True)
class Bar:
    timestamp: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class Position(BaseModel):
    symbol: str
    quantity: float = 0.0
    average_entry_price: float = 0.0
    entry_time: datetime | None = None
    current_price: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    stop_loss: float | None = None
    take_profit: float | None = None

    def update_market_price(self, price: float) -> None:
        self.current_price = price
        if self.quantity != 0:
            self.unrealized_pnl = (self.current_price - self.average_entry_price) * self.quantity
        else:
            self.unrealized_pnl = 0.0


@dataclass(slots=True)
class Order:
    timestamp: datetime
    symbol: str
    order_type: OrderType
    side: OrderSide
    quantity: float
    price_limit: float | None = None
    stop_price: float | None = None


class TradeRecord(BaseModel):
    trade_id: str = Field(default_factory=lambda: uuid4().hex)
    symbol: str
    side: OrderSide
    entry_time: datetime
    exit_time: datetime
    entry_price: float  # Precio nominal de mercado en entrada
    effective_entry_price: float = 0.0  # Precio real de ejecución con slippage
    exit_price: float  # Precio nominal de mercado en salida
    effective_exit_price: float = 0.0  # Precio real de ejecución con slippage
    quantity: float
    gross_pnl: float = 0.0  # PnL antes de comisiones y slippage
    commission_paid: float = 0.0  # Comisiones acumuladas (entrada + salida)
    fees_paid: float = 0.0  # Alias compatible con el frontend
    slippage_cost: float = 0.0  # Coste monetario del deslizamiento
    pnl: float  # PnL neta final
    pnl_pct: float  # Retorno porcentual neto
    exit_reason: str = "SIGNAL"


@dataclass(slots=True)
class Trade:
    entry_timestamp: datetime
    exit_timestamp: datetime | None
    symbol: str
    side: SignalType
    quantity: float
    entry_price: float
    exit_price: float | None = None
    pnl: float = 0.0


class PortfolioState(BaseModel):
    timestamp: datetime
    cash: float
    equity: float
    positions: dict[str, Position] = Field(default_factory=dict)


__all__ = ["Bar", "Order", "PortfolioState", "Position", "Trade", "TradeRecord"]
