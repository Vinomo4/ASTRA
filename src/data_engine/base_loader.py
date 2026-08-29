"""Define the common interface for OHLCV data loaders."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

import pandas as pd


class BaseDataLoader(ABC):
    """Define the interface for loading OHLCV market data."""

    @abstractmethod
    def fetch_ohlcv(
        self, symbol: str, start: datetime | str, end: datetime | str, timeframe: str = "1d"
    ) -> pd.DataFrame:
        """Fetch OHLCV market data for a symbol.

        Args:
            symbol: Market symbol accepted by the loader implementation.
            start: Inclusive start timestamp.
            end: Inclusive end timestamp.
            timeframe: Requested candle interval.

        Returns:
            A data frame with standardized OHLCV columns.

        Raises:
            NotImplementedError: Always; subclasses must implement data retrieval.
        """
        raise NotImplementedError


DataLoader = BaseDataLoader
