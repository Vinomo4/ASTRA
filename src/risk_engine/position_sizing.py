from __future__ import annotations

from src.core.constants import OrderSide, OrderType, SignalType
from src.core.events import OrderEvent, SignalEvent


class VolatilityPositionSizer:
    def __init__(
        self,
        risk_fraction: float = 0.01,
        atr_multiplier_sl: float = 2.0,
        atr_multiplier_tp: float = 4.0,
        atr_multiplier: float | None = None,
        risk_per_trade: float | None = None,
    ) -> None:
        self.risk_fraction = risk_fraction if risk_per_trade is None else risk_per_trade
        self.atr_multiplier_sl = atr_multiplier if atr_multiplier is not None else atr_multiplier_sl
        self.atr_multiplier_tp = atr_multiplier_tp

    def calculate_order_quantity(
        self, current_equity: float, current_price: float, current_atr: float
    ) -> float:
        if current_atr <= 0 or current_price <= 0 or current_equity <= 0:
            return 0.0

        risk_capital = current_equity * self.risk_fraction
        stop_distance = current_atr * self.atr_multiplier_sl

        if stop_distance <= 0:
            return 0.0

        target_quantity = risk_capital / stop_distance
        # 2% cash buffer reserved for commission and slippage
        max_affordable_quantity = (current_equity * 0.98) / current_price
        return min(target_quantity, max_affordable_quantity)

    def size_order(
        self,
        signal: SignalEvent,
        equity: float,
        current_price: float,
        current_atr: float,
    ) -> OrderEvent | None:
        if current_price <= 0 or current_atr <= 0 or equity <= 0:
            return None

        final_quantity = self.calculate_order_quantity(equity, current_price, current_atr)
        if final_quantity <= 0:
            return None

        is_long = (
            signal.signal_type == SignalType.LONG
            if isinstance(signal.signal_type, SignalType)
            else str(signal.signal_type).upper() == "LONG"
        )
        side = OrderSide.BUY if is_long else OrderSide.SELL

        sl_distance = current_atr * self.atr_multiplier_sl
        tp_distance = current_atr * self.atr_multiplier_tp

        stop_loss = (
            current_price - sl_distance if side == OrderSide.BUY else current_price + sl_distance
        )
        take_profit = (
            current_price + tp_distance if side == OrderSide.BUY else current_price - tp_distance
        )

        return OrderEvent(
            timestamp=signal.timestamp,
            symbol=signal.symbol,
            order_type=OrderType.MARKET,
            side=side,
            quantity=round(final_quantity, 4),
            stop_loss=round(stop_loss, 2),
            take_profit=round(take_profit, 2),
            target_price=round(current_price, 2),
        )
