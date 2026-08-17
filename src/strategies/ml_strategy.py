from __future__ import annotations

from typing import Protocol

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.base_strategy import BaseStrategy


class ProbabilisticModel(Protocol):
    def predict_proba(self, features: object) -> object: ...


class MLStrategy(BaseStrategy):
    def __init__(
        self, name: str, params: dict[str, object], model: ProbabilisticModel | None = None
    ) -> None:
        super().__init__(name, params)
        self.model = model

    def on_bar(self, event: MarketDataEvent) -> list[SignalEvent]:
        if self.model is None:
            return []
        threshold = float(self.params.get("threshold", 0.6))
        probability = 0.0
        if probability > threshold:
            return [
                SignalEvent(
                    timestamp=event.timestamp,
                    symbol=event.symbol,
                    signal_type=SignalType.LONG,
                    strength=probability,
                    strategy_id=self.name,
                )
            ]
        return []
