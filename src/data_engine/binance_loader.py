# src/data_engine/binance_loader.py
from __future__ import annotations

import time
from datetime import datetime
import pandas as pd
import requests

from src.data_engine.base_loader import BaseDataLoader


class BinanceLoader(BaseDataLoader):
    BASE_URL = "https://api.binance.com/api/v3/klines"

    def _map_symbol(self, symbol: str) -> str:
        s = symbol.upper().replace("-", "").replace("/", "").replace("_", "")
        if s.endswith("USD") and not s.endswith("USDT"):
            s = s[:-3] + "USDT"
        return s

    def _map_interval(self, timeframe: str) -> str:
        tf = timeframe.lower()
        if tf in ("1d", "4h", "1h", "15m", "5m", "1m"):
            return tf
        if tf == "d":
            return "1d"
        if tf == "h":
            return "1h"
        return "1d"

    def fetch_ohlcv(
        self,
        symbol: str,
        start: datetime | str,
        end: datetime | str,
        timeframe: str = "1d",
    ) -> pd.DataFrame:
        binance_symbol = self._map_symbol(symbol)
        interval = self._map_interval(timeframe)

        start_ts = int(pd.to_datetime(start, utc=True).timestamp() * 1000)
        end_ts = int(pd.to_datetime(end, utc=True).timestamp() * 1000)

        all_klines: list[list] = []
        cur_start = start_ts
        limit = 1000

        while cur_start < end_ts:
            params = {
                "symbol": binance_symbol,
                "interval": interval,
                "startTime": cur_start,
                "endTime": end_ts,
                "limit": limit,
            }
            try:
                resp = requests.get(self.BASE_URL, params=params, timeout=10)
                if resp.status_code != 200:
                    break
                data = resp.json()
                if not data or not isinstance(data, list):
                    break

                all_klines.extend(data)
                last_open_time = data[-1][0]
                cur_start = last_open_time + 1

                if len(data) < limit:
                    break

                time.sleep(0.05)  # Respeto de límites de API
            except Exception:
                break

        if not all_klines:
            return pd.DataFrame(
                columns=["timestamp", "symbol", "open", "high", "low", "close", "volume"]
            )

        df = pd.DataFrame(
            all_klines,
            columns=[
                "open_time",
                "open",
                "high",
                "low",
                "close",
                "volume",
                "close_time",
                "quote_asset_volume",
                "number_of_trades",
                "taker_buy_base_volume",
                "taker_buy_quote_volume",
                "ignore",
            ],
        )

        df["timestamp"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = df[col].astype(float)

        df["symbol"] = symbol
        return df[["timestamp", "symbol", "open", "high", "low", "close", "volume"]]

    load = fetch_ohlcv
