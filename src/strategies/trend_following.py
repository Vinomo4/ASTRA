from __future__ import annotations

import pandas as pd

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.features.technical import TechnicalFeatures
from src.strategies.base_strategy import BaseStrategy


class TrendFollowingStrategy(BaseStrategy):
    def __init__(self, fast_ema: int = 20, slow_ema: int = 50, atr_period: int = 14) -> None:
        super().__init__(
            name="TrendFollowing_EMA_Breakout",
            params={"fast_ema": fast_ema, "slow_ema": slow_ema, "atr_period": atr_period},
        )
        self.fast_ema = fast_ema
        self.slow_ema = slow_ema
        self.atr_period = atr_period
        self.history: list[dict[str, object]] = []

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        data = df.copy()
        data["fast_ema"] = TechnicalFeatures.calculate_ema(data, self.fast_ema)
        data["slow_ema"] = TechnicalFeatures.calculate_ema(data, self.slow_ema)
        data["atr"] = TechnicalFeatures.calculate_atr(data, self.atr_period)

        data["signal"] = SignalType.HOLD

        long_condition = (data["fast_ema"] > data["slow_ema"]) & (
            data["fast_ema"].shift(1) <= data["slow_ema"].shift(1)
        )
        exit_condition = (data["fast_ema"] < data["slow_ema"]) & (
            data["fast_ema"].shift(1) >= data["slow_ema"].shift(1)
        )

        data.loc[long_condition, "signal"] = SignalType.LONG
        data.loc[exit_condition, "signal"] = SignalType.EXIT
        return data

    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        self.history.append(
            {
                "timestamp": event.timestamp,
                "symbol": event.symbol,
                "open": event.open,
                "high": event.high,
                "low": event.low,
                "close": event.close,
                "volume": event.volume,
            }
        )

        if len(self.history) < self.slow_ema + 1:
            return None

        df_subset = pd.DataFrame(self.history[-(self.slow_ema + 10) :])
        signals_df = self.generate_signals(df_subset)
        latest_signal = signals_df.iloc[-1]["signal"]

        if latest_signal != SignalType.HOLD:
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=latest_signal,
                strategy_id=self.name,
            )
        return None
