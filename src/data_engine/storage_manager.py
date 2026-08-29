"""Persist market data and strategy presets in DuckDB."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import duckdb
import pandas as pd


class StorageManager:
    """Manage persistent OHLCV data and strategy presets."""

    def __init__(self, db_path: str = "data/market_database.duckdb") -> None:
        """Initialize the storage database and its tables.

        Args:
            db_path: Path to the DuckDB database file.

        Raises:
            duckdb.Error: If the database or required tables cannot be initialized.
        """
        self.db_path = db_path
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        with duckdb.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ohlcv (
                    timestamp TIMESTAMP,
                    symbol VARCHAR,
                    timeframe VARCHAR DEFAULT '1d',
                    open DOUBLE,
                    high DOUBLE,
                    low DOUBLE,
                    close DOUBLE,
                    volume DOUBLE,
                    PRIMARY KEY (timestamp, symbol, timeframe)
                )
                """
            )
            try:
                conn.execute(
                    "ALTER TABLE ohlcv ADD COLUMN IF NOT EXISTS timeframe VARCHAR DEFAULT '1d'"
                )
            except Exception:
                pass

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS strategy_presets (
                    preset_name VARCHAR PRIMARY KEY,
                    strategy_id VARCHAR NOT NULL,
                    timeframe VARCHAR DEFAULT '1d',
                    strategy_params VARCHAR NOT NULL,
                    risk_fraction DOUBLE NOT NULL,
                    atr_multiplier_sl DOUBLE NOT NULL,
                    atr_multiplier_tp DOUBLE NOT NULL,
                    commission_bps DOUBLE NOT NULL,
                    commission_fixed DOUBLE NOT NULL,
                    slippage_bps DOUBLE NOT NULL,
                    gap_slippage_enabled BOOLEAN NOT NULL,
                    description VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            try:
                conn.execute(
                    "ALTER TABLE strategy_presets ADD COLUMN IF NOT EXISTS timeframe VARCHAR DEFAULT '1d'"
                )
            except Exception:
                pass

    def save_ohlcv(self, df: pd.DataFrame, timeframe: str = "1d") -> None:
        """Store OHLCV rows, replacing records with matching primary keys.

        Args:
            df: OHLCV rows to persist.
            timeframe: Candle interval assigned when the input has no timeframe column.

        Raises:
            duckdb.Error: If the rows cannot be written to the database.
        """
        if df.empty:
            return
        data = df.copy()
        if "timeframe" not in data.columns:
            data["timeframe"] = timeframe

        if "timestamp" in data.columns:
            data["timestamp"] = pd.to_datetime(data["timestamp"], utc=True).dt.tz_localize(None)

        with duckdb.connect(self.db_path) as conn:
            conn.register("df_view", data)
            conn.execute(
                """
                INSERT OR REPLACE INTO ohlcv
                SELECT timestamp, symbol, timeframe, open, high, low, close, volume FROM df_view
                """
            )

    def load_ohlcv(
        self, symbol: str, start_date: str, end_date: str, timeframe: str = "1d"
    ) -> pd.DataFrame:
        """Load stored OHLCV rows for a symbol and date range.

        Args:
            symbol: Exact market symbol stored in the database.
            start_date: Inclusive range start accepted by pandas.
            end_date: Inclusive range end accepted by pandas.
            timeframe: Exact stored candle interval.

        Returns:
            Matching OHLCV rows ordered by timestamp.

        Raises:
            ValueError: If either date cannot be parsed.
            duckdb.Error: If the database query fails.
        """
        start_ts = pd.to_datetime(start_date, utc=True).tz_localize(None)
        end_ts = pd.to_datetime(end_date, utc=True).tz_localize(None)

        if end_ts.hour == 0 and end_ts.minute == 0 and end_ts.second == 0:
            end_ts = end_ts + pd.Timedelta(days=1) - pd.Timedelta(microseconds=1)

        query = """
            SELECT timestamp, symbol, timeframe, open, high, low, close, volume
            FROM ohlcv
            WHERE symbol = ?
              AND timeframe = ?
              AND timestamp >= ?
              AND timestamp <= ?
            ORDER BY timestamp ASC
        """
        with duckdb.connect(self.db_path) as conn:
            df = conn.execute(query, [symbol, timeframe, start_ts, end_ts]).df()

        if not df.empty and "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

        return df

    def save_strategy_preset(
        self,
        preset_name: str,
        strategy_id: str,
        strategy_params: dict[str, Any],
        risk_fraction: float,
        atr_multiplier_sl: float,
        atr_multiplier_tp: float,
        timeframe: str = "1d",
        commission_bps: float = 5.0,
        commission_fixed: float = 0.0,
        slippage_bps: float = 2.0,
        gap_slippage_enabled: bool = True,
        description: str = "",
    ) -> dict[str, Any]:
        """Store a named strategy and execution preset.

        Args:
            preset_name: Unique name used to identify the preset.
            strategy_id: Identifier of the configured strategy.
            strategy_params: Strategy-specific parameter values.
            risk_fraction: Fraction of equity risked per trade.
            atr_multiplier_sl: ATR multiplier used for stop loss placement.
            atr_multiplier_tp: ATR multiplier used for take profit placement.
            timeframe: Candle interval configured for the strategy.
            commission_bps: Variable commission in basis points.
            commission_fixed: Fixed commission charged per order.
            slippage_bps: Simulated slippage in basis points.
            gap_slippage_enabled: Whether gap slippage is enabled.
            description: Optional human-readable preset description.

        Returns:
            The stored preset represented as a dictionary.

        Raises:
            TypeError: If the strategy parameters are not JSON serializable.
            duckdb.Error: If the preset cannot be written or read back.
        """
        params_json = json.dumps(strategy_params)
        with duckdb.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO strategy_presets (
                    preset_name, strategy_id, timeframe, strategy_params,
                    risk_fraction, atr_multiplier_sl, atr_multiplier_tp,
                    commission_bps, commission_fixed, slippage_bps, gap_slippage_enabled,
                    description, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                [
                    preset_name,
                    strategy_id,
                    timeframe,
                    params_json,
                    risk_fraction,
                    atr_multiplier_sl,
                    atr_multiplier_tp,
                    commission_bps,
                    commission_fixed,
                    slippage_bps,
                    gap_slippage_enabled,
                    description,
                ],
            )
        return self.get_strategy_preset(preset_name)

    def get_strategy_preset(self, preset_name: str) -> dict[str, Any] | None:
        """Retrieve a strategy preset by name.

        Args:
            preset_name: Unique preset name to retrieve.

        Returns:
            The stored preset, or ``None`` when the name does not exist.

        Raises:
            json.JSONDecodeError: If stored strategy parameters contain invalid JSON.
            duckdb.Error: If the database query fails.
        """
        with duckdb.connect(self.db_path) as conn:
            rel = conn.execute(
                """
                SELECT preset_name, strategy_id, timeframe, strategy_params,
                       risk_fraction, atr_multiplier_sl, atr_multiplier_tp,
                       commission_bps, commission_fixed, slippage_bps, gap_slippage_enabled,
                       description, updated_at
                FROM strategy_presets
                WHERE preset_name = ?
                """,
                [preset_name],
            ).fetchone()

        if not rel:
            return None

        return {
            "preset_name": rel[0],
            "strategy_id": rel[1],
            "timeframe": rel[2] or "1d",
            "strategy_params": json.loads(rel[3]),
            "risk_fraction": float(rel[4]),
            "atr_multiplier_sl": float(rel[5]),
            "atr_multiplier_tp": float(rel[6]),
            "commission_bps": float(rel[7]),
            "commission_fixed": float(rel[8]),
            "slippage_bps": float(rel[9]),
            "gap_slippage_enabled": bool(rel[10]),
            "description": rel[11] or "",
            "updated_at": str(rel[12]),
        }

    def list_strategy_presets(self) -> list[dict[str, Any]]:
        """List strategy presets from most to least recently updated.

        Returns:
            Stored presets represented as dictionaries.

        Raises:
            json.JSONDecodeError: If stored strategy parameters contain invalid JSON.
            duckdb.Error: If the database query fails.
        """
        with duckdb.connect(self.db_path) as conn:
            rows = conn.execute(
                """
                SELECT preset_name, strategy_id, timeframe, strategy_params,
                       risk_fraction, atr_multiplier_sl, atr_multiplier_tp,
                       commission_bps, commission_fixed, slippage_bps, gap_slippage_enabled,
                       description, updated_at
                FROM strategy_presets
                ORDER BY updated_at DESC
                """
            ).fetchall()

        return [
            {
                "preset_name": r[0],
                "strategy_id": r[1],
                "timeframe": r[2] or "1d",
                "strategy_params": json.loads(r[3]),
                "risk_fraction": float(r[4]),
                "atr_multiplier_sl": float(r[5]),
                "atr_multiplier_tp": float(r[6]),
                "commission_bps": float(r[7]),
                "commission_fixed": float(r[8]),
                "slippage_bps": float(r[9]),
                "gap_slippage_enabled": bool(r[10]),
                "description": r[11] or "",
                "updated_at": str(r[12]),
            }
            for r in rows
        ]

    def delete_strategy_preset(self, preset_name: str) -> bool:
        """Delete a strategy preset by name.

        Args:
            preset_name: Unique preset name to delete.

        Returns:
            ``True`` when the delete statement completes.

        Raises:
            duckdb.Error: If the database statement fails.
        """
        with duckdb.connect(self.db_path) as conn:
            res = conn.execute("DELETE FROM strategy_presets WHERE preset_name = ?", [preset_name])
            return res.fetchall() is not None
