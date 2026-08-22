# tests/strategies/test_volatility_breakout.py
from datetime import datetime
import numpy as np
import pandas as pd
import pytest

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.registry import StrategyRegistry
from src.strategies.volatility_breakout import VolatilityBreakoutStrategy


class TestVolatilityBreakoutStrategy:
    @pytest.fixture
    def mock_market_data(self) -> pd.DataFrame:
        """Generates synthetic compression and breakout OHLCV data."""
        np.random.seed(42)
        n = 100
        dates = pd.date_range("2023-01-01", periods=n, freq="D")

        # Compression range (100 to 102) followed by a sharp breakout (102 to 140)
        close = np.concatenate(
            [
                np.linspace(100, 102, 50) + np.random.normal(0, 0.2, 50),
                np.linspace(103, 140, 50) + np.random.normal(0, 0.5, 50),
            ]
        )
        high = close + np.random.uniform(0.5, 1.5, n)
        low = close - np.random.uniform(0.5, 1.5, n)
        open_p = close + np.random.uniform(-0.3, 0.3, n)
        volume = np.concatenate(
            [
                np.full(50, 1000.0),
                np.full(50, 3000.0),  # Volume surge on breakout
            ]
        )

        return pd.DataFrame(
            {
                "timestamp": dates,
                "symbol": ["BTC-USD"] * n,
                "open": open_p,
                "high": high,
                "low": low,
                "close": close,
                "volume": volume,
            }
        )

    def test_metadata_contract(self):
        """Strategy must register valid metadata with all required parameters."""
        meta = VolatilityBreakoutStrategy.get_metadata()
        assert meta.id == "regime_volatility_breakout"
        param_names = [p.name for p in meta.parameters]
        assert "channel_period" in param_names
        assert "adx_threshold" in param_names
        assert "volume_multiplier" in param_names
        assert "atr_period" in param_names

    def test_registry_resolution(self):
        """Strategy must be instantiable via StrategyRegistry."""
        strat = StrategyRegistry.create(
            "regime_volatility_breakout",
            channel_period=10,
            adx_threshold=20.0,
        )
        assert isinstance(strat, VolatilityBreakoutStrategy)
        assert strat.channel_period == 10
        assert strat.adx_threshold == 20.0

    def test_on_bar_signal_generation(self, mock_market_data):
        """Streaming MarketDataEvents into on_bar must produce valid SignalEvents on breakout."""
        strat = VolatilityBreakoutStrategy(
            channel_period=15,
            volume_ma_period=15,
            adx_period=10,
            adx_threshold=15.0,
            volume_multiplier=1.1,
        )

        signals: list[SignalEvent] = []
        for _, row in mock_market_data.iterrows():
            event = MarketDataEvent(
                timestamp=row["timestamp"],
                symbol=row["symbol"],
                open=float(row["open"]),
                high=float(row["high"]),
                low=float(row["low"]),
                close=float(row["close"]),
                volume=float(row["volume"]),
            )
            sig = strat.on_bar(event)
            if sig is not None:
                signals.append(sig)

        assert len(signals) > 0
        assert any(s.signal_type == SignalType.LONG for s in signals)

    def test_lookahead_bias_prevention(self):
        """Donchian channel must evaluate breakout against prior historical bars only."""
        strat = VolatilityBreakoutStrategy(
            channel_period=5,
            volume_ma_period=5,
            adx_period=5,
            adx_threshold=0.0,
            volume_multiplier=0.5,
        )

        # Feed 5 bars with high = 105.0
        for i in range(5):
            bar = MarketDataEvent(
                timestamp=datetime(2023, 1, i + 1),
                symbol="BTC-USD",
                open=100.0,
                high=105.0,
                low=95.0,
                close=100.0,
                volume=1000.0,
            )
            sig = strat.on_bar(bar)
            assert sig is None

        # Bar 6: close at 106.0 breaks above the prior 5-bar high of 105.0
        breakout_bar = MarketDataEvent(
            timestamp=datetime(2023, 1, 6),
            symbol="BTC-USD",
            open=102.0,
            high=108.0,
            low=101.0,
            close=106.0,
            volume=2000.0,
        )
        sig = strat.on_bar(breakout_bar)
        assert sig is not None
        assert sig.signal_type == SignalType.LONG
