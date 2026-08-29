"""Route OHLCV requests across local and remote data sources."""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from src.data_engine.base_loader import BaseDataLoader
from src.data_engine.binance_loader import BinanceLoader
from src.data_engine.local_loader import LocalFileLoader
from src.data_engine.yfinance_loader import YFinanceLoader


class UnifiedDataLoader(BaseDataLoader):
    """Load OHLCV data from the first suitable configured source."""

    def __init__(self) -> None:
        """Initialize the local, Binance, and Yahoo Finance loaders."""
        self.binance = BinanceLoader()
        self.local = LocalFileLoader()
        self.yfinance = YFinanceLoader()

    def _is_crypto(self, symbol: str) -> bool:
        s = symbol.upper()
        return any(
            s.endswith(suffix)
            for suffix in ["-USD", "-USDT", "/USDT", "/USD", "USDT", "BTC", "ETH"]
        ) or s in ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"]

    def fetch_ohlcv(
        self, symbol: str, start: datetime | str, end: datetime | str, timeframe: str = "1d"
    ) -> pd.DataFrame:
        """Fetch OHLCV data from local files, Binance, or Yahoo Finance.

        Args:
            symbol: Market symbol to retrieve.
            start: Requested start timestamp.
            end: Requested end timestamp.
            timeframe: Requested candle interval.

        Returns:
            Standardized OHLCV rows from the selected source.

        Raises:
            ValueError: If the selected source cannot parse input or returns no data.
        """
        # Prefer locally stored institutional data such as SPY 4h.
        df_local = self.local.fetch_ohlcv(symbol, start, end, timeframe=timeframe)
        if not df_local.empty and len(df_local) >= 50:
            return df_local

        # Query Binance next for crypto assets.
        if self._is_crypto(symbol):
            df_crypto = self.binance.fetch_ohlcv(symbol, start, end, timeframe=timeframe)
            if not df_crypto.empty and len(df_crypto) >= 50:
                return df_crypto

        # Fall back to Yahoo Finance for equities and ETFs.
        return self.yfinance.fetch_ohlcv(symbol, start, end, timeframe=timeframe)
