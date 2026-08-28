# src/data_engine/local_loader.py
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import pandas as pd

from src.data_engine.base_loader import BaseDataLoader


class LocalFileLoader(BaseDataLoader):
    def __init__(self, data_dir: str = "data/historical") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _find_file(self, symbol: str, timeframe: str) -> Path | None:
        clean_symbol = symbol.replace("-", "_").replace("/", "_").upper()
        candidates = [
            self.data_dir / f"{clean_symbol}_{timeframe}.csv",
            self.data_dir / f"{clean_symbol}_{timeframe}.parquet",
            self.data_dir / f"{symbol}_{timeframe}.csv",
            self.data_dir / f"{symbol}_{timeframe}.parquet",
            self.data_dir / f"{clean_symbol}.csv",
            self.data_dir / f"{clean_symbol}.parquet",
        ]
        for path in candidates:
            if path.exists():
                return path
        return None

    def fetch_ohlcv(
        self,
        symbol: str,
        start: datetime | str,
        end: datetime | str,
        timeframe: str = "1d",
    ) -> pd.DataFrame:
        file_path = self._find_file(symbol, timeframe)
        if file_path is None:
            return pd.DataFrame(
                columns=["timestamp", "symbol", "open", "high", "low", "close", "volume"]
            )

        if file_path.suffix == ".parquet":
            df = pd.read_parquet(file_path)
        else:
            df = pd.read_csv(file_path)

        # Normalización de columnas
        col_map = {c: c.lower().strip() for c in df.columns}
        df.rename(columns=col_map, inplace=True)

        alias_map = {
            "date": "timestamp",
            "datetime": "timestamp",
            "time": "timestamp",
            "vol": "volume",
        }
        df.rename(columns=alias_map, inplace=True)

        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        start_ts = pd.to_datetime(start, utc=True)
        end_ts = pd.to_datetime(end, utc=True)

        df = df[(df["timestamp"] >= start_ts) & (df["timestamp"] <= end_ts)].copy()
        for col in ["open", "high", "low", "close", "volume"]:
            if col in df.columns:
                df[col] = df[col].astype(float)

        df["symbol"] = symbol
        df = df.sort_values("timestamp").reset_index(drop=True)
        return df[["timestamp", "symbol", "open", "high", "low", "close", "volume"]]

    load = fetch_ohlcv
