from __future__ import annotations

from pathlib import Path

import duckdb
import pandas as pd

from src.core.config import settings


class StorageManager:
    def __init__(self, db_path: str = settings.duckdb_path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> duckdb.DuckDBPyConnection:
        return duckdb.connect(str(self.db_path))

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ohlcv (
                    timestamp TIMESTAMPTZ,
                    symbol VARCHAR,
                    open DOUBLE,
                    high DOUBLE,
                    low DOUBLE,
                    close DOUBLE,
                    volume DOUBLE,
                    PRIMARY KEY (timestamp, symbol)
                );
                """
            )

    def save_ohlcv(self, df: pd.DataFrame) -> None:
        with self._get_connection() as conn:
            conn.register("incoming_df", df)
            conn.execute(
                """
                INSERT OR REPLACE INTO ohlcv
                SELECT timestamp, symbol, open, high, low, close, volume
                FROM incoming_df
                """
            )

    def load_ohlcv(self, symbol: str, start: str, end: str) -> pd.DataFrame:
        with self._get_connection() as conn:
            query = """
                SELECT timestamp, symbol, open, high, low, close, volume
                FROM ohlcv
                WHERE symbol = ? AND timestamp >= ? AND timestamp <= ?
                ORDER BY timestamp ASC
            """
            return conn.execute(query, [symbol, start, end]).df()
