import pandas as pd

from src.data_engine.storage_manager import StorageManager


def test_duckdb_storage_roundtrip(tmp_path) -> None:
    db_file = tmp_path / "test.duckdb"
    manager = StorageManager(str(db_file))

    test_df = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(["2025-01-01 00:00:00+00:00"]),
            "symbol": ["AAPL"],
            "open": [100.0],
            "high": [105.0],
            "low": [99.0],
            "close": [104.0],
            "volume": [1000.0],
        }
    )

    manager.save_ohlcv(test_df)
    loaded = manager.load_ohlcv("AAPL", "2025-01-01", "2025-01-02")
    assert len(loaded) == 1
    assert loaded.iloc[0]["close"] == 104.0
