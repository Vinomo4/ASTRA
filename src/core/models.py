"""Core market, order, position, trade, and portfolio models."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4

from pydantic import BaseModel, Field

from src.core.constants import OrderSide, OrderType, SignalType


@dataclass(slots=True)
class Bar:
    """Store open-high-low-close-volume data for one market interval.

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


class Position(BaseModel):
    """Track the quantity, valuation, and risk levels of an open position.

    Attributes:
        symbol: Traded instrument identifier.
        quantity: Current signed quantity.
        average_entry_price: Quantity-weighted entry price.
        entry_time: Time at which the position was opened.
        current_price: Most recent market price.
        unrealized_pnl: Profit or loss at the current market price.
        realized_pnl: Profit or loss realized by closed quantity.
        stop_loss: Optional stop-loss price.
        take_profit: Optional take-profit price.
    """

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
        """Update the current price and recompute unrealized profit or loss.

        Args:
            price: Latest market price for the position.
        """
        self.current_price = price
        if self.quantity != 0:
            self.unrealized_pnl = (self.current_price - self.average_entry_price) * self.quantity
        else:
            self.unrealized_pnl = 0.0


@dataclass(slots=True)
class Order:
    """Store the requested terms of an order.

    Attributes:
        timestamp: Time at which the order was created.
        symbol: Instrument to trade.
        order_type: Requested execution type.
        side: Buy or sell side.
        quantity: Number of units to execute.
        price_limit: Optional limit-order price.
        stop_price: Optional stop-order trigger price.
    """

    timestamp: datetime
    symbol: str
    order_type: OrderType
    side: OrderSide
    quantity: float
    price_limit: float | None = None
    stop_price: float | None = None


class TradeRecord(BaseModel):
    """Store the complete realized outcome of a closed trade.

    Attributes:
        trade_id: Unique identifier generated for the trade.
        symbol: Traded instrument identifier.
        side: Side used to open the trade.
        entry_time: Entry execution time.
        exit_time: Exit execution time.
        entry_price: Nominal market price at entry.
        effective_entry_price: Entry price after execution slippage.
        exit_price: Nominal market price at exit.
        effective_exit_price: Exit price after execution slippage.
        quantity: Number of units traded.
        gross_pnl: Profit or loss before commission and slippage.
        commission_paid: Total commission charged at entry and exit.
        fees_paid: Commission alias used by the frontend.
        slippage_cost: Monetary cost of execution slippage.
        pnl: Final net profit or loss.
        pnl_pct: Final net percentage return.
        exit_reason: Reason the position was closed.
    """

    trade_id: str = Field(default_factory=lambda: uuid4().hex)
    symbol: str
    side: OrderSide
    entry_time: datetime
    exit_time: datetime
    entry_price: float  # Nominal market price at entry
    effective_entry_price: float = 0.0  # Executed entry price after slippage
    exit_price: float  # Nominal market price at exit
    effective_exit_price: float = 0.0  # Executed exit price after slippage
    quantity: float
    gross_pnl: float = 0.0  # PnL before commission and slippage
    commission_paid: float = 0.0  # Total entry and exit commission
    fees_paid: float = 0.0  # Frontend-compatible alias
    slippage_cost: float = 0.0  # Monetary execution slippage cost
    pnl: float  # Final net PnL
    pnl_pct: float  # Net percentage return
    exit_reason: str = "SIGNAL"


@dataclass(slots=True)
class Trade:
    """Store the mutable lifecycle and outcome of a trade.

    Attributes:
        entry_timestamp: Position entry time.
        exit_timestamp: Position exit time when closed.
        symbol: Traded instrument identifier.
        side: Directional strategy signal used to enter.
        quantity: Number of units traded.
        entry_price: Entry execution price.
        exit_price: Exit execution price when closed.
        pnl: Realized profit or loss.
    """

    entry_timestamp: datetime
    exit_timestamp: datetime | None
    symbol: str
    side: SignalType
    quantity: float
    entry_price: float
    exit_price: float | None = None
    pnl: float = 0.0


class PortfolioState(BaseModel):
    """Capture a point-in-time portfolio valuation.

    Attributes:
        timestamp: Valuation time.
        cash: Uninvested portfolio cash.
        equity: Total portfolio equity.
        positions: Open positions keyed by symbol.
    """

    timestamp: datetime
    cash: float
    equity: float
    positions: dict[str, Position] = Field(default_factory=dict)


__all__ = ["Bar", "Order", "PortfolioState", "Position", "Trade", "TradeRecord"]
