"""Fetch initial AAPL market data and persist it in DuckDB."""

import duckdb

from src.core.config import settings
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader


def main() -> None:
    """Download AAPL bars, store them, and verify database persistence."""
    symbol = "AAPL"
    start_date = "2023-01-01"
    end_date = "2025-01-01"

    print(f"1. Fetching OHLCV data for {symbol} ({start_date} to {end_date})...")
    loader = YFinanceLoader()
    df = loader.fetch_ohlcv(symbol, start=start_date, end=end_date)
    print(f"   Downloaded {len(df)} bars successfully.")

    print(f"2. Saving records to DuckDB at: {settings.duckdb_path}")
    storage = StorageManager(settings.duckdb_path)
    storage.save_ohlcv(df)

    print("3. Querying stored data back from DuckDB to verify persistence...")
    loaded_df = storage.load_ohlcv(symbol, start_date, end_date)
    print(f"   Retrieved {len(loaded_df)} bars from DuckDB.")

    # Direct SQL check
    with duckdb.connect(settings.duckdb_path) as conn:
        count = conn.execute("SELECT COUNT(*) FROM ohlcv WHERE symbol = ?", [symbol]).fetchone()[0]
        sample = conn.execute(
            "SELECT * FROM ohlcv WHERE symbol = ? ORDER BY timestamp DESC LIMIT 3", [symbol]
        ).df()

    print(f"\nTotal rows in database for {symbol}: {count}")
    print("\nRecent records:")
    print(sample)


if __name__ == "__main__":
    main()
