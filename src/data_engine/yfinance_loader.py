# src/data_engine/yfinance_loader.py
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pandas as pd
import yfinance as yf

from src.data_engine.base_loader import BaseDataLoader


class YFinanceLoader(BaseDataLoader):
    def fetch_ohlcv(
        self,
        symbol: str,
        start: datetime | str,
        end: datetime | str,
        timeframe: str = "1d",
    ) -> pd.DataFrame:
        now = datetime.now(UTC)

        # 1. Parse start and end into timezone-aware UTC timestamps
        start_ts = pd.to_datetime(start, utc=True)
        end_ts = pd.to_datetime(end, utc=True)

        # 2. Map intervals and enforce Yahoo Finance intraday lookback constraints
        fetch_interval = timeframe
        if timeframe in ("15m", "5m"):
            max_start = now - timedelta(days=58)
            if start_ts < max_start:
                start_ts = max_start
            fetch_interval = "15m"
        elif timeframe == "4h":
            max_start = now - timedelta(days=720)
            if start_ts < max_start:
                start_ts = max_start
            fetch_interval = "1h"  # Fetch 1h base bars for 4h resampling
        elif timeframe == "1h":
            max_start = now - timedelta(days=720)
            if start_ts < max_start:
                start_ts = max_start
            fetch_interval = "1h"

        # 3. Download data from Yahoo Finance
        ticker = yf.Ticker(symbol)
        df = ticker.history(
            start=start_ts.strftime("%Y-%m-%d"),
            end=end_ts.strftime("%Y-%m-%d"),
            interval=fetch_interval,
            auto_adjust=False,
        )

        if df.empty:
            raise ValueError(
                f"No historical data returned for symbol '{symbol}' with interval '{timeframe}'."
            )

        # 4. Standardize column names
        df = df.reset_index()
        col_map = {
            "Date": "timestamp",
            "Datetime": "timestamp",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
        df.rename(columns=col_map, inplace=True)
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

        # 5. Resample to 4H if requested
        if timeframe == "4h":
            df = (
                df.set_index("timestamp")
                .resample("4h")
                .agg(
                    {
                        "open": "first",
                        "high": "max",
                        "low": "min",
                        "close": "last",
                        "volume": "sum",
                    }
                )
                .dropna()
                .reset_index()
            )

        df["symbol"] = symbol
        return df[["timestamp", "symbol", "open", "high", "low", "close", "volume"]]

    # Backward compatibility alias
    load = fetch_ohlcv
