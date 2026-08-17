from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

import pandas as pd


class BaseDataLoader(ABC):
    @abstractmethod
    def fetch_ohlcv(
        self, symbol: str, start: datetime | str, end: datetime | str, timeframe: str = "1d"
    ) -> pd.DataFrame:
        raise NotImplementedError


DataLoader = BaseDataLoader
