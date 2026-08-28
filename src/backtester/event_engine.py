# src/backtester/event_engine.py
from __future__ import annotations

from collections import deque
from datetime import datetime
from typing import Any

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
        risk_fraction: float = 0.01,
        atr_multiplier_sl: float = 2.0,
        atr_multiplier_tp: float = 4.0,
        # Friction parameters
        commission_bps: float = 5.0,
        commission_fixed: float = 0.0,
        slippage_bps: float = 2.0,
        gap_slippage_enabled: bool = True,
    ) -> None:
        self.strategy = strategy
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.gap_slippage_enabled = gap_slippage_enabled

        self.broker = SimulatedBroker(
            commission_bps=commission_bps,
            commission_fixed=commission_fixed,
            slippage_bps=slippage_bps,
        )

        self.sizer = VolatilityPositionSizer(
            risk_fraction=risk_fraction,
            atr_multiplier_sl=atr_multiplier_sl,
            atr_multiplier_tp=atr_multiplier_tp,
        )

        self.positions: dict[str, Position] = {}
        self.trades: list[TradeRecord] = []
        self.executions: list[dict[str, Any]] = []
        self.equity_history: list[dict[str, Any]] = []
        self.snapshots: list[dict[str, Any]] = []
        self.pending_order: OrderEvent | None = None

        # Cumulative friction tracking
        self.entry_fees: dict[str, float] = {}
        self.entry_slippages: dict[str, float] = {}
        self.entry_nominal_prices: dict[str, float] = {}

    def _close_position(
        self,
        position: Position,
        exit_price: float,
        timestamp: datetime,
        reason: str,
    ) -> None:
        order = OrderEvent(
            timestamp=timestamp,
            symbol=position.symbol,
            order_type=OrderType.MARKET,
            side=OrderSide.SELL,
            quantity=position.quantity,
        )

        fill = self.broker.execute_order(order, exit_price)
        revenue = (fill.fill_price * fill.quantity) - fill.commission
        self.capital += revenue

        entry_nominal = self.entry_nominal_prices.get(position.symbol, position.average_entry_price)
        entry_fee = self.entry_fees.get(position.symbol, 0.0)
        entry_slip = self.entry_slippages.get(position.symbol, 0.0)

        total_fees = entry_fee + fill.commission
        total_slippage = entry_slip + fill.slippage
        gross_pnl = (fill.nominal_price - entry_nominal) * fill.quantity
        net_pnl = (fill.fill_price - position.average_entry_price) * fill.quantity - total_fees
        net_pnl_pct = (net_pnl / (position.average_entry_price * fill.quantity)) * 100.0

        time_str = (
            timestamp.strftime("%Y-%m-%d") if hasattr(timestamp, "strftime") else str(timestamp)
        )

        self.trades.append(
            TradeRecord(
                trade_id=f"T_{len(self.trades) + 1}",
                symbol=position.symbol,
                side=OrderSide.BUY,
                entry_time=position.entry_time or timestamp,
                exit_time=timestamp,
                entry_price=round(entry_nominal, 2),
                effective_entry_price=round(position.average_entry_price, 2),
                exit_price=round(fill.nominal_price, 2),
                effective_exit_price=round(fill.fill_price, 2),
                quantity=fill.quantity,
                gross_pnl=round(gross_pnl, 2),
                fees_paid=round(total_fees, 2),
                slippage_cost=round(total_slippage, 2),
                pnl=round(net_pnl, 2),
                pnl_pct=round(net_pnl_pct, 2),
                exit_reason=reason,
            )
        )

        self.executions.append(
            {
                "time": time_str,
                "price": round(fill.fill_price, 2),
                "nominal_price": round(fill.nominal_price, 2),
                "side": OrderSide.SELL,
                "quantity": round(fill.quantity, 4),
                "reason": reason,
            }
        )

        position.quantity = 0.0
        position.average_entry_price = 0.0
        position.entry_time = None
        position.stop_loss = None
        position.take_profit = None
        self.entry_fees.pop(position.symbol, None)
        self.entry_slippages.pop(position.symbol, None)
        self.entry_nominal_prices.pop(position.symbol, None)

    def run(self, df: pd.DataFrame) -> dict[str, Any]:
        data = df.copy().sort_values("timestamp").reset_index(drop=True)
        if "atr" not in data.columns:
            data["atr"] = TechnicalFeatures.calculate_atr(data, period=14).bfill()

        peak_equity = self.initial_capital

        for _, row in data.iterrows():
            current_time = row["timestamp"]
            open_price = float(row["open"])
            high_price = float(row["high"])
            low_price = float(row["low"])
            close_price = float(row["close"])
            volume = float(row["volume"])
            symbol = str(row["symbol"])
            current_atr = float(row["atr"])

            current_position = self.positions.get(symbol, Position(symbol=symbol))

            # 1. Next-Bar Execution at Open
            if self.pending_order and self.pending_order.symbol == symbol:
                if self.pending_order.side == OrderSide.BUY and current_position.quantity == 0:
                    fill = self.broker.execute_order(self.pending_order, open_price)
                    cost = (fill.fill_price * fill.quantity) + fill.commission

                    if self.capital >= cost and fill.quantity > 0:
                        self.capital -= cost
                        current_position.quantity = fill.quantity
                        current_position.average_entry_price = fill.fill_price
                        current_position.entry_time = current_time
                        current_position.stop_loss = self.pending_order.stop_loss
                        current_position.take_profit = self.pending_order.take_profit
                        self.positions[symbol] = current_position

                        self.entry_nominal_prices[symbol] = open_price
                        self.entry_fees[symbol] = fill.commission
                        self.entry_slippages[symbol] = fill.slippage

                        time_str = (
                            current_time.strftime("%Y-%m-%d")
                            if hasattr(current_time, "strftime")
                            else str(current_time)
                        )
                        self.executions.append(
                            {
                                "time": time_str,
                                "price": round(fill.fill_price, 2),
                                "nominal_price": round(fill.nominal_price, 2),
                                "side": OrderSide.BUY,
                                "quantity": round(fill.quantity, 4),
                                "reason": "SIGNAL_ENTRY",
                            }
                        )

                elif self.pending_order.side == OrderSide.SELL and current_position.quantity > 0:
                    self._close_position(current_position, open_price, current_time, "SIGNAL_EXIT")

                self.pending_order = None

            # 2. Intra-bar Exits (Stop Loss / Take Profit)
            if current_position.quantity > 0:
                if (
                    current_position.stop_loss is not None
                    and low_price <= current_position.stop_loss
                ):
                    if self.gap_slippage_enabled and open_price < current_position.stop_loss:
                        exit_price = open_price
                    else:
                        exit_price = current_position.stop_loss

                    self._close_position(current_position, exit_price, current_time, "STOP_LOSS")

                elif (
                    current_position.take_profit is not None
                    and high_price >= current_position.take_profit
                ):
                    exit_price = max(current_position.take_profit, open_price)
                    self._close_position(current_position, exit_price, current_time, "TAKE_PROFIT")

            # 3. Mark-to-Market Valuation at Bar Close
            current_position.update_market_price(close_price)
            total_equity = self.capital + (current_position.quantity * close_price)
            peak_equity = max(peak_equity, total_equity)

            drawdown_pct = ((total_equity - peak_equity) / peak_equity) * 100.0
            unrealized_pnl = (
                (close_price - current_position.average_entry_price) * current_position.quantity
                if current_position.quantity > 0
                else 0.0
            )

            time_str = (
                current_time.strftime("%Y-%m-%d")
                if hasattr(current_time, "strftime")
                else str(current_time)
            )

            self.equity_history.append({"timestamp": current_time, "equity": total_equity})
            self.snapshots.append(
                {
                    "time": time_str,
                    "equity": round(total_equity, 2),
                    "cash": round(self.capital, 2),
                    "position_quantity": round(current_position.quantity, 4),
                    "position_avg_price": round(current_position.average_entry_price, 2),
                    "unrealized_pnl": round(unrealized_pnl, 2),
                    "drawdown_pct": round(drawdown_pct, 2),
                }
            )

            # 4. Strategy Evaluation (Generates orders for t+1)
            bar_event = MarketDataEvent(
                timestamp=current_time,
                symbol=symbol,
                open=open_price,
                high=high_price,
                low=low_price,
                close=close_price,
                volume=volume,
            )
            signal = self.strategy.on_bar(bar_event)

            if signal and signal.signal_type == SignalType.LONG and current_position.quantity == 0:
                self.pending_order = self.sizer.size_order(
                    signal, total_equity, close_price, current_atr
                )
            elif signal and signal.signal_type == SignalType.EXIT and current_position.quantity > 0:
                self.pending_order = OrderEvent(
                    timestamp=current_time,
                    symbol=symbol,
                    order_type=OrderType.MARKET,
                    side=OrderSide.SELL,
                    quantity=current_position.quantity,
                )

        # 5. Performance Metrics Generation
        active_pos_data = None
        if not data.empty:
            last_price = float(data.iloc[-1]["close"])
            for sym, pos in self.positions.items():
                if pos.quantity > 0:
                    entry_time_str = (
                        pos.entry_time.strftime("%Y-%m-%d")
                        if hasattr(pos.entry_time, "strftime")
                        else str(pos.entry_time)
                    )
                    unrealized_pnl = (last_price - pos.average_entry_price) * pos.quantity
                    unrealized_pnl_pct = (last_price / pos.average_entry_price - 1.0) * 100.0
                    active_pos_data = {
                        "symbol": sym,
                        "entry_time": entry_time_str,
                        "entry_price": round(pos.average_entry_price, 2),
                        "current_price": round(last_price, 2),
                        "quantity": round(pos.quantity, 4),
                        "unrealized_pnl": round(unrealized_pnl, 2),
                        "unrealized_pnl_pct": round(unrealized_pnl_pct, 2),
                        "stop_loss": pos.stop_loss,
                        "take_profit": pos.take_profit,
                    }

        equity_df = pd.DataFrame(self.equity_history).set_index("timestamp")["equity"]
        max_dd, _ = PerformanceAnalytics.calculate_max_drawdown(equity_df)

        total_fees_paid = sum(getattr(t, "fees_paid", 0.0) for t in self.trades)
        total_slippage_paid = sum(getattr(t, "slippage_cost", 0.0) for t in self.trades)

        return {
            "initial_capital": self.initial_capital,
            "final_equity": equity_df.iloc[-1] if not equity_df.empty else self.initial_capital,
            "total_return_pct": (equity_df.iloc[-1] / self.initial_capital - 1.0) * 100,
            "cagr": PerformanceAnalytics.calculate_cagr(equity_df) * 100,
            "sharpe_ratio": PerformanceAnalytics.calculate_sharpe_ratio(equity_df),
            "sortino_ratio": PerformanceAnalytics.calculate_sortino_ratio(equity_df),
            "max_drawdown_pct": max_dd * 100,
            "total_trades": len(self.trades),
            "total_fees_paid": round(total_fees_paid, 2),
            "total_slippage_paid": round(total_slippage_paid, 2),
            "active_position": active_pos_data,
            "execution_markers": self.executions,
            "equity_curve": equity_df.to_dict(),
            "snapshots": self.snapshots,
            "trades": self.trades,
        }


__all__ = ["BacktestEngine", "EventEngine"]
