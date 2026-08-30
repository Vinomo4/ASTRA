"""Fetch benchmark market data (BTC-USD, ETH-USD, SPY) and persist to DuckDB and CSV."""

from pathlib import Path
import duckdb

from src.core.config import settings
from src.data_engine.storage_manager import StorageManager
from src.data_engine.unified_loader import UnifiedDataLoader

# Standard ASTRA benchmark universe
UNIVERSE = [
    ("BTC-USD", "4h"),
    ("BTC-USD", "1d"),
    ("ETH-USD", "4h"),
    ("ETH-USD", "1d"),
    ("SPY", "4h"),
    ("SPY", "1d"),
]

START_DATE = "2021-01-01"
END_DATE = "2025-12-31"


def main() -> None:
    """Download OHLCV bars, persist to DuckDB, and export CSVs for offline deployment."""
    loader = UnifiedDataLoader()
    storage = StorageManager(settings.duckdb_path)
    
    historical_dir = Path("data/historical")
    historical_dir.mkdir(parents=True, exist_ok=True)

    print(f"1. Fetching dataset universe ({START_DATE} to {END_DATE})...")
    for symbol, timeframe in UNIVERSE:
        print(f"   Fetching {symbol} ({timeframe})...")
        try:
            df = loader.fetch_ohlcv(symbol, start=START_DATE, end=END_DATE, timeframe=timeframe)
            if df.empty:
                print(f"   [WARN] No data returned for {symbol} ({timeframe})")
                continue

            # 1. Save to DuckDB
            storage.save_ohlcv(df)
            print(f"   Saved {len(df)} bars to DuckDB.")

            # 2. Export offline CSV for Git / Render deployment
            clean_sym = symbol.replace("-", "_")
            csv_path = historical_dir / f"{clean_sym}_{timeframe}.csv"
            df.to_csv(csv_path, index=False)
            print(f"   Exported offline file: {csv_path}")

        except Exception as err:
            print(f"   [ERROR] Failed loading {symbol} ({timeframe}): {err}")

    # Database summary check
    print("\n2. Database Row Summary:")
    with duckdb.connect(settings.duckdb_path) as conn:
        summary = conn.execute(
            "SELECT symbol, timeframe, COUNT(*) as bar_count, MIN(timestamp) as start_ts, MAX(timestamp) as end_ts "
            "FROM ohlcv GROUP BY symbol, timeframe ORDER BY symbol, timeframe"
        ).df()
    print(summary)


if __name__ == "__main__":
    main()