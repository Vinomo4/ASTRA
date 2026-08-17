from __future__ import annotations

from collections import deque
from datetime import datetime

import pandas as pd

from src.analytics.metrics import PerformanceAnalytics
from src.core.constants import OrderSide, OrderType, SignalType
from src.core.events import Event, MarketDataEvent, OrderEvent
from src.core.models import Position, TradeRecord
from src.execution_engine.simulated_broker import SimulatedBroker
from src.features.technical import TechnicalFeatures
from src.risk_engine.position_sizing import VolatilityPositionSizer
from src.strategies.base_strategy import BaseStrategy


class EventEngine:
    def __init__(self) -> None:
        self.queue: deque[Event] = deque()

    def put(self, event: Event) -> None:
        self.queue.append(event)

    def run(self) -> list[Event]:
        events: list[Event] = []
        while self.queue:
            events.append(self.queue.popleft())
        return events


class BacktestEngine:
    def __init__(
        self,
        strategy: BaseStrategy,
        initial_capital: float = 100_000.0,
        commission_rate: float = 0.0005,
        slippage_rate: float = 0.0002,
        risk_fraction: float = 0.01,
    ) -> None:
        self.strategy = strategy
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.broker = SimulatedBroker(commission_rate=commission_rate)
        self.sizer = VolatilityPositionSizer(risk_fraction=risk_fraction)
        self.positions: dict[str, Position] = {}
        self.trades: list[TradeRecord] = []
        self.equity_history: list[dict[str, object]] = []

    def run(self, df: pd.DataFrame) -> dict[str, object]:
        data = df.copy().sort_values("timestamp").reset_index(drop=True)
        data["atr"] = TechnicalFeatures.calculate_atr(data, period=14).bfill()

        for _, row in data.iterrows():
            current_time = row["timestamp"]
            current_price = float(row["close"])
            symbol = str(row["symbol"])
            current_atr = float(row["atr"])

            current_position = self.positions.get(symbol, Position(symbol=symbol))
            current_position.update_market_price(current_price)

            total_equity = self.capital + (current_position.quantity * current_price)
            self.equity_history.append({"timestamp": current_time, "equity": total_equity})

            bar_event = MarketDataEvent(
                timestamp=current_time,
                symbol=symbol,
                open=float(row["open"]),
                high=float(row["high"]),
                low=float(row["low"]),
                close=current_price,
                volume=float(row["volume"]),
            )
            signal = self.strategy.on_bar(bar_event)

            # --- LONG ENTRY EXECUTION ---
            if signal and signal.signal_type == SignalType.LONG and current_position.quantity == 0:
                order = self.sizer.size_order(signal, total_equity, current_price, current_atr)
                if order:
                    fill = self.broker.execute_order(order, current_price)
                    cost = (fill.fill_price * fill.quantity) + fill.commission
                    if self.capital >= cost:
                        self.capital -= cost
                        current_position.quantity = fill.quantity
                        current_position.average_entry_price = fill.fill_price
                        current_position.entry_time = fill.timestamp  # 1. Capture entry timestamp
                        self.positions[symbol] = current_position

            # --- EXIT / SELL EXECUTION ---
            elif signal and signal.signal_type == SignalType.EXIT and current_position.quantity > 0:
                order = OrderEvent(
                    timestamp=current_time,
                    symbol=symbol,
                    order_type=OrderType.MARKET,
                    side=OrderSide.SELL,
                    quantity=current_position.quantity,
                )
                fill = self.broker.execute_order(order, current_price)
                revenue = (fill.fill_price * fill.quantity) - fill.commission
                self.capital += revenue

                pnl = (
                    fill.fill_price - current_position.average_entry_price
                ) * fill.quantity - fill.commission
                pnl_pct = (fill.fill_price / current_position.average_entry_price) - 1.0

                self.trades.append(
                    TradeRecord(
                        trade_id=f"T_{len(self.trades) + 1}",
                        symbol=symbol,
                        side=OrderSide.BUY,
                        entry_time=current_position.entry_time
                        or current_time,  # 2. Use recorded entry timestamp
                        exit_time=current_time,
                        entry_price=current_position.average_entry_price,
                        exit_price=fill.fill_price,
                        quantity=fill.quantity,
                        pnl=pnl,
                        pnl_pct=pnl_pct,
                        commission_paid=fill.commission,
                        slippage_cost=fill.slippage,
                    )
                )
                # 3. Cleanly reset position state
                current_position.quantity = 0.0
                current_position.average_entry_price = 0.0
                current_position.entry_time = None
                self.positions[symbol] = current_position

        equity_df = pd.DataFrame(self.equity_history).set_index("timestamp")["equity"]
        max_dd, _ = PerformanceAnalytics.calculate_max_drawdown(equity_df)

        return {
            "initial_capital": self.initial_capital,
            "final_equity": equity_df.iloc[-1] if not equity_df.empty else self.initial_capital,
            "total_return_pct": (equity_df.iloc[-1] / self.initial_capital - 1.0) * 100,
            "cagr": PerformanceAnalytics.calculate_cagr(equity_df) * 100,
            "sharpe_ratio": PerformanceAnalytics.calculate_sharpe_ratio(equity_df),
            "sortino_ratio": PerformanceAnalytics.calculate_sortino_ratio(equity_df),
            "max_drawdown_pct": max_dd * 100,
            "total_trades": len(self.trades),
            "equity_curve": equity_df.to_dict(),
        }


__all__ = ["EventEngine", "BacktestEngine"]
