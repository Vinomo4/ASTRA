# tests/strategies/test_mean_reversion.py
from datetime import UTC, datetime, timedelta

from src.core.constants import SignalType
from src.core.events import MarketDataEvent
from src.strategies.mean_reversion import MeanReversionStrategy
from src.strategies.registry import StrategyRegistry


class TestMeanReversionStrategy:
    def test_metadata_and_registry(self):
        meta = MeanReversionStrategy.get_metadata()
        assert meta.id == "statistical_mean_reversion"
        assert meta.category == "Rule-Based"

        strat = StrategyRegistry.create(
            "statistical_mean_reversion",
            lookback_period=20,
            z_entry_threshold=-2.0,
        )
        assert isinstance(strat, MeanReversionStrategy)
        assert strat.lookback_period == 20

    def test_entry_signal_on_oversold_range(self):
        strat = MeanReversionStrategy(
            lookback_period=10,
            z_entry_threshold=-1.8,
            rsi_period=2,
            rsi_entry_threshold=20.0,
            adx_max_regime=30.0,
        )

        base_dt = datetime(2024, 1, 1, tzinfo=UTC)

        # Feed 25 stable range bars at price 100.0
        for i in range(25):
            event = MarketDataEvent(
                timestamp=base_dt + timedelta(hours=i),
                symbol="SPY",
                open=100.0,
                high=100.5,
                low=99.5,
                close=100.0,
                volume=1000.0,
            )
            strat.on_bar(event)

        # Feed single-bar oversold capitulation drop
        drop_event = MarketDataEvent(
            timestamp=base_dt + timedelta(hours=26),
            symbol="SPY",
            open=99.0,
            high=99.0,
            low=92.0,
            close=92.5,
            volume=1500.0,
        )
        sig = strat.on_bar(drop_event)

        assert sig is not None
        assert sig.signal_type == SignalType.LONG
        assert sig.stop_loss is not None
        assert sig.stop_loss < 92.5

    def test_trend_gating_blocks_entry(self):
        strat = MeanReversionStrategy(
            lookback_period=10,
            z_entry_threshold=-1.0,
            rsi_period=2,
            rsi_entry_threshold=30.0,
            adx_max_regime=15.0,
        )

        base_dt = datetime(2024, 1, 1, tzinfo=UTC)
        # Feed sustained directional drop over 30 bars (high ADX trend)
        for i in range(30):
            price = 100.0 - (i * 2.0)
            event = MarketDataEvent(
                timestamp=base_dt + timedelta(hours=i),
                symbol="SPY",
                open=price + 1.0,
                high=price + 1.5,
                low=price - 0.5,
                close=price,
                volume=1000.0,
            )
            strat.on_bar(event)

        # High ADX suppresses counter-trend entries
        assert not strat._in_position
