from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd

from src.core.events import MarketDataEvent, SignalEvent


class BaseStrategy(ABC):
    def __init__(self, name: str, params: dict | None = None) -> None:
        self.name = name
        self.params = params or {}

    @abstractmethod
    def generate_signals(self, historical_data: pd.DataFrame) -> pd.DataFrame:
        """Vectorized signal generation for backtesting."""
        raise NotImplementedError

    @abstractmethod
    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        """Event-driven incremental signal generation."""
        raise NotImplementedError
