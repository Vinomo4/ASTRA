# src/data_engine/unified_loader.py
from __future__ import annotations

from datetime import datetime
import pandas as pd

from src.data_engine.base_loader import BaseDataLoader
from src.data_engine.binance_loader import BinanceLoader
from src.data_engine.local_loader import LocalFileLoader
from src.data_engine.yfinance_loader import YFinanceLoader


class UnifiedDataLoader(BaseDataLoader):
    def __init__(self) -> None:
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
        self,
        symbol: str,
        start: datetime | str,
        end: datetime | str,
        timeframe: str = "1d",
    ) -> pd.DataFrame:
        # 1. Intentar carga desde archivo local prealmacenado (para datasets institucionales como SPY 4h)
        df_local = self.local.fetch_ohlcv(symbol, start, end, timeframe=timeframe)
        if not df_local.empty and len(df_local) >= 50:
            return df_local

        # 2. Si es criptoactivo, consultar la API REST de Binance (histórico completo 2021-2025)
        if self._is_crypto(symbol):
            df_crypto = self.binance.fetch_ohlcv(symbol, start, end, timeframe=timeframe)
            if not df_crypto.empty and len(df_crypto) >= 50:
                return df_crypto

        # 3. Fallback a Yahoo Finance (acciones/ETFs 1d o ventana intradiaria disponible)
        return self.yfinance.fetch_ohlcv(symbol, start, end, timeframe=timeframe)

    load = fetch_ohlcv
