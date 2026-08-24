# tests/unit/test_labeling.py
from datetime import UTC

import numpy as np
import pandas as pd
import pytest

from src.ml_engine.labeling import (
    add_vertical_barriers,
    cusum_filter,
    get_daily_volatility,
    triple_barrier_labeling,
)


@pytest.fixture
def synthetic_price_series() -> pd.Series:
    dates = pd.date_range("2024-01-01", periods=100, freq="D", tz=UTC)
    prices = np.full(100, 100.0)
    prices[30:50] = np.linspace(100.0, 120.0, 20)
    prices[50:70] = 120.0
    prices[70:90] = np.linspace(120.0, 90.0, 20)
    prices[90:] = 90.0
    return pd.Series(prices, index=dates, name="close")


class TestLabelingEngine:
    def test_daily_volatility_computation(self, synthetic_price_series):
        vol = get_daily_volatility(synthetic_price_series, span=10)
        assert isinstance(vol, pd.Series)
        assert len(vol) == len(synthetic_price_series)
        assert (vol >= 0.0).all()
        assert vol.iloc[35] > vol.iloc[10]

    def test_cusum_filter_sampling(self, synthetic_price_series):
        vol = get_daily_volatility(synthetic_price_series, span=10)
        events = cusum_filter(synthetic_price_series, threshold=vol)
        assert isinstance(events, pd.DatetimeIndex)
        assert len(events) > 0
        assert all(dt in synthetic_price_series.index for dt in events)

    def test_vertical_barriers(self, synthetic_price_series):
        events = synthetic_price_series.index[10:15]
        barriers = add_vertical_barriers(events, synthetic_price_series, num_bars=5)
        assert len(barriers) == len(events)
        for start_dt, end_dt in barriers.items():
            start_loc = synthetic_price_series.index.get_loc(start_dt)
            end_loc = synthetic_price_series.index.get_loc(end_dt)
            assert end_loc - start_loc == 5

    def test_triple_barrier_upper_take_profit_touch(self, synthetic_price_series):
        event_dt = synthetic_price_series.index[29]
        events = pd.DatetimeIndex([event_dt])
        target = pd.Series([0.05], index=[event_dt])

        vertical_barrier = add_vertical_barriers(events, synthetic_price_series, num_bars=15)
        labels = triple_barrier_labeling(
            close=synthetic_price_series,
            events=events,
            pt_sl=[1.0, 1.0],
            target=target,
            vertical_barrier=vertical_barrier,
        )

        assert len(labels) == 1
        assert labels.loc[event_dt, "bin"] == 1
        assert labels.loc[event_dt, "ret"] >= 0.05

    def test_triple_barrier_lower_stop_loss_touch(self, synthetic_price_series):
        event_dt = synthetic_price_series.index[69]
        events = pd.DatetimeIndex([event_dt])
        target = pd.Series([0.05], index=[event_dt])

        vertical_barrier = add_vertical_barriers(events, synthetic_price_series, num_bars=15)
        labels = triple_barrier_labeling(
            close=synthetic_price_series,
            events=events,
            pt_sl=[1.0, 1.0],
            target=target,
            vertical_barrier=vertical_barrier,
        )

        assert len(labels) == 1
        assert labels.loc[event_dt, "bin"] == -1
        assert labels.loc[event_dt, "ret"] <= -0.05

    def test_triple_barrier_vertical_timeout_zero_bin(self, synthetic_price_series):
        event_dt = synthetic_price_series.index[2]
        events = pd.DatetimeIndex([event_dt])
        target = pd.Series([0.10], index=[event_dt])

        vertical_barrier = add_vertical_barriers(events, synthetic_price_series, num_bars=5)
        labels = triple_barrier_labeling(
            close=synthetic_price_series,
            events=events,
            pt_sl=[1.0, 1.0],
            target=target,
            vertical_barrier=vertical_barrier,
            min_ret=0.01,
        )

        assert len(labels) == 1
        assert labels.loc[event_dt, "bin"] == 0
