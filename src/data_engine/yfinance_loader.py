from __future__ import annotations

from datetime import datetime

import pandas as pd
import yfinance as yf

from src.data_engine.base_loader import BaseDataLoader


class YFinanceLoader(BaseDataLoader):
    def fetch_ohlcv(
        self, symbol: str, start: datetime | str, end: datetime | str, timeframe: str = "1d"
    ) -> pd.DataFrame:
        ticker = yf.Ticker(symbol)
        df = ticker.history(start=start, end=end, interval=timeframe, auto_adjust=False)

        if df.empty:
            raise ValueError(f"No historical data returned for symbol {symbol}")

        df = df.reset_index()
        df.rename(
            columns={
                "Date": "timestamp",
                "Datetime": "timestamp",
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Volume": "volume",
            },
            inplace=True,
        )

        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        df["symbol"] = symbol
        return df[["timestamp", "symbol", "open", "high", "low", "close", "volume"]]
