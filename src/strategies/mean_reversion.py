from __future__ import annotations

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.base_strategy import BaseStrategy


class MeanReversionStrategy(BaseStrategy):
    def on_bar(self, event: MarketDataEvent) -> list[SignalEvent]:
        deviation = (event.close - event.open) / event.open if event.open else 0.0
        threshold = float(self.params.get("threshold", 0.01))
        if deviation <= -threshold:
            return [
                SignalEvent(
                    timestamp=event.timestamp,
                    symbol=event.symbol,
                    signal_type=SignalType.LONG,
                    strategy_id=self.name,
                )
            ]
        if deviation >= threshold:
            return [
                SignalEvent(
                    timestamp=event.timestamp,
                    symbol=event.symbol,
                    signal_type=SignalType.SHORT,
                    strategy_id=self.name,
                )
            ]
        return []
