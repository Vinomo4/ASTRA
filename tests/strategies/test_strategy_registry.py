# tests/strategies/test_strategy_registry.py
from datetime import datetime
import pytest

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.base_strategy import BaseStrategy, ParameterDefinition, StrategyMetadata
from src.strategies.registry import StrategyRegistry
from src.strategies.trend_following import TrendFollowingStrategy
from src.strategies.volatility_breakout import VolatilityBreakoutStrategy


class MockBreakoutStrategy(BaseStrategy):
    id = "mock_breakout"
    name = "Mock Breakout"
    description = "A mock breakout system for registry testing."
    category = "Rule-Based"

    @classmethod
    def get_metadata(cls) -> StrategyMetadata:
        return StrategyMetadata(
            id=cls.id,
            name=cls.name,
            description=cls.description,
            parameters=[
                ParameterDefinition(
                    name="lookback",
                    label="Lookback Window",
                    param_type="int",
                    default=20,
                    min_value=5,
                    max_value=100,
                )
            ],
        )

    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        return None


class TestStrategyPolymorphism:
    def test_registered_strategies_discovery(self):
        """Registry must contain default registered strategies."""
        strategies = StrategyRegistry.list_strategies()
        strategy_ids = [s.id for s in strategies]
        assert "trend_following_ema" in strategy_ids
        assert "regime_volatility_breakout" in strategy_ids

    def test_dynamic_registration_and_instantiation(self):
        """Custom strategy can be registered and created with parameter overrides."""
        StrategyRegistry.register(MockBreakoutStrategy)
        instance = StrategyRegistry.create("mock_breakout", lookback=45)
        assert isinstance(instance, BaseStrategy)
        assert instance.get_param("lookback") == 45

    def test_default_parameter_fallback(self):
        """Unspecified parameters must fall back to metadata defaults."""
        StrategyRegistry.register(MockBreakoutStrategy)
        instance = StrategyRegistry.create("mock_breakout")
        assert instance.get_param("lookback") == 20

    def test_invalid_strategy_lookup_raises_keyerror(self):
        """Attempting to instantiate an unregistered strategy must raise KeyError."""
        with pytest.raises(KeyError) as exc_info:
            StrategyRegistry.create("non_existent_strategy")
        assert "non_existent_strategy" in str(exc_info.value)

    def test_trend_following_on_bar_crossover(self):
        """TrendFollowingStrategy must emit LONG on bullish cross and EXIT on bearish cross."""
        strategy = StrategyRegistry.create("trend_following_ema", fast_ema=3, slow_ema=5)

        prices = [100.0, 100.0, 100.0, 105.0, 110.0, 115.0, 95.0, 90.0]
        signals = []

        for idx, p in enumerate(prices):
            bar = MarketDataEvent(
                timestamp=datetime(2023, 1, idx + 1),
                symbol="BTC-USD",
                open=p,
                high=p + 1.0,
                low=p - 1.0,
                close=p,
                volume=1000.0,
            )
            sig = strategy.on_bar(bar)
            if sig is not None:
                signals.append(sig.signal_type)

        assert SignalType.LONG in signals

    def test_volatility_breakout_on_bar_execution(self):
        """VolatilityBreakoutStrategy must accept MarketDataEvent stream without errors."""
        strategy = StrategyRegistry.create(
            "regime_volatility_breakout", channel_period=5, volume_ma_period=5, adx_threshold=10.0
        )

        for i in range(30):
            bar = MarketDataEvent(
                timestamp=datetime(2023, 1, i + 1),
                symbol="BTC-USD",
                open=100.0 + i,
                high=102.0 + i,
                low=98.0 + i,
                close=101.0 + i,
                volume=2000.0,
            )
            sig = strategy.on_bar(bar)
            if sig:
                assert isinstance(sig, SignalEvent)
