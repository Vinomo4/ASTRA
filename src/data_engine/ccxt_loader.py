from __future__ import annotations

import pandas as pd

from src.data_engine.base_loader import DataLoader


class CCXTLoader(DataLoader):
    def __init__(self, exchange_name: str) -> None:
        self.exchange_name = exchange_name

    def load(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        return pd.DataFrame(
            columns=["timestamp", "symbol", "open", "high", "low", "close", "volume"]
        )
