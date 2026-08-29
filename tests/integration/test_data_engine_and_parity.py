# tests/integration/test_data_engine_and_parity.py
from __future__ import annotations

import pandas as pd
import pytest

from src.api.routers.simulation import get_market_data
from src.backtester.event_engine import BacktestEngine
from src.backtester.walk_forward import WalkForwardEngine
from src.data_engine.storage_manager import StorageManager
from src.data_engine.unified_loader import UnifiedDataLoader
from src.strategies.registry import StrategyRegistry


@pytest.fixture
def temp_storage(tmp_path) -> StorageManager:
    """Create an isolated DuckDB instance for each test run."""
    db_file = tmp_path / "test_market_database.duckdb"
    return StorageManager(db_path=str(db_file))


@pytest.fixture
def unified_loader() -> UnifiedDataLoader:
    return UnifiedDataLoader()


@pytest.mark.parametrize(
    "symbol, timeframe, min_bars, expected_start_year",
    [
        ("SPY", "4h", 2400, 2021),
        ("SPY", "1d", 1200, 2021),
        ("BTC-USD", "4h", 10000, 2021),
        ("BTC-USD", "1d", 1800, 2021),
        ("ETH-USD", "4h", 10000, 2021),
        ("ETH-USD", "1d", 1800, 2021),
    ],
)
def test_unified_data_loader_coverage(
    unified_loader: UnifiedDataLoader,
    symbol: str,
    timeframe: str,
    min_bars: int,
    expected_start_year: int,
) -> None:
    """Verify that UnifiedDataLoader routes and downloads the full history."""
    df = unified_loader.fetch_ohlcv(
        symbol=symbol,
        start="2021-01-01",
        end="2025-12-31",
        timeframe=timeframe,
    )

    assert not df.empty, f"No data returned for {symbol} ({timeframe})"
    assert len(df) >= min_bars, f"Bar count {len(df)} is below the minimum {min_bars}"

    required_columns = {"timestamp", "symbol", "open", "high", "low", "close", "volume"}
    assert required_columns.issubset(df.columns), f"Missing columns for {symbol}"

    min_timestamp = pd.to_datetime(df["timestamp"].min(), utc=True)
    assert min_timestamp.year == expected_start_year, (
        f"Unexpected start year: {min_timestamp.year}"
    )


def test_duckdb_storage_caching_and_parity(
    temp_storage: StorageManager,
    unified_loader: UnifiedDataLoader,
) -> None:
    """Verify DuckDB persistence and exact read/write parity."""
    symbol = "BTC-USD"
    timeframe = "1d"
    start_date = "2021-01-01"
    end_date = "2025-12-31"

    # 1. First call: fetch from the source and write to DuckDB.
    df_fetched = get_market_data(
        symbol=symbol,
        start_date=start_date,
        end_date=end_date,
        timeframe=timeframe,
        storage=temp_storage,
        loader=unified_loader,
    )
    assert not df_fetched.empty

    # 2. Second call: read directly from DuckDB.
    df_cached = temp_storage.load_ohlcv(
        symbol=symbol,
        start_date=start_date,
        end_date=end_date,
        timeframe=timeframe,
    )
    assert len(df_fetched) == len(df_cached)

    # 3. Compare numeric columns exactly.
    df_fetched_sorted = df_fetched.sort_values("timestamp").reset_index(drop=True)
    df_cached_sorted = df_cached.sort_values("timestamp").reset_index(drop=True)

    cols_to_compare = ["open", "high", "low", "close", "volume"]
    pd.testing.assert_frame_equal(
        df_fetched_sorted[cols_to_compare],
        df_cached_sorted[cols_to_compare],
        check_dtype=False,
    )


def test_walk_forward_monolithic_parity() -> None:
    """Verify exact parity between direct and partitioned walk-forward runs."""
    wf_engine = WalkForwardEngine()

    df = wf_engine._fetch_market_data(
        symbol="BTC-USD",
        start_date="2021-01-01",
        end_date="2025-12-31",
        timeframe="4h",
    )
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    if df["timestamp"].dt.tz is not None:
        df["timestamp"] = df["timestamp"].dt.tz_convert("UTC").dt.tz_localize(None)
    df = df.sort_values("timestamp").reset_index(drop=True)

    # 1. Direct continuous execution.
    strat_direct = StrategyRegistry.create("trend_following_ema", fast_period=9, slow_period=21)
    engine_direct = BacktestEngine(
        strategy=strat_direct,
        initial_capital=100_000.0,
        risk_fraction=0.01,
        atr_multiplier_sl=2.0,
        atr_multiplier_tp=4.0,
        commission_bps=5.0,
        slippage_bps=2.0,
        gap_slippage_enabled=True,
    )
    res_direct = engine_direct.run(df)

    # 2. Rolling walk-forward execution without retraining.
    res_wf = wf_engine.run_rolling_walk_forward(
        symbol="BTC-USD",
        start_date="2021-01-01",
        end_date="2025-12-31",
        strategy_id="trend_following_ema",
        strategy_params={"fast_period": 9, "slow_period": 21},
        timeframe="4h",
        initial_capital=100_000.0,
        train_duration_months=0,
        test_step_months=6,
        risk_fraction=0.01,
        atr_multiplier_sl=2.0,
        atr_multiplier_tp=4.0,
        commission_bps=5.0,
        slippage_bps=2.0,
        gap_slippage_enabled=True,
    )

    # Validate exact parity.
    assert len(engine_direct.trades) == res_wf["total_trades"]
    assert abs(res_direct["final_equity"] - res_wf["final_equity"]) < 1e-2
    assert abs(res_direct["total_return_pct"] - res_wf["total_return_pct"]) < 1e-4
    assert abs(res_direct["max_drawdown_pct"] - res_wf["max_drawdown_pct"]) < 1e-4
