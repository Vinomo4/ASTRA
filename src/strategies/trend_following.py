# src/strategies/trend_following.py
from __future__ import annotations

from typing import Any

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.base_strategy import BaseStrategy, ParameterDefinition, StrategyMetadata
from src.strategies.registry import StrategyRegistry


@StrategyRegistry.register
class TrendFollowingStrategy(BaseStrategy):
    id = "trend_following_ema"
    name = "EMA Trend Following"
    description = (
        "Fast/Slow Exponential Moving Average crossover system with ATR volatility brackets."
    )
    category = "Rule-Based"

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self.fast_ema_period = int(self.get_param("fast_ema", 20))
        self.slow_ema_period = int(self.get_param("slow_ema", 50))
        self.atr_period = int(self.get_param("atr_period", 14))

        # Alpha smoothing constants for online EMA updates
        self._fast_alpha = 2.0 / (self.fast_ema_period + 1.0)
        self._slow_alpha = 2.0 / (self.slow_ema_period + 1.0)

        # Indicator internal state
        self._fast_ema: float | None = None
        self._slow_ema: float | None = None
        self._prev_fast_ema: float | None = None
        self._prev_slow_ema: float | None = None

    @classmethod
    def get_metadata(cls) -> StrategyMetadata:
        return StrategyMetadata(
            id=cls.id,
            name=cls.name,
            description=cls.description,
            category=cls.category,
            parameters=[
                ParameterDefinition(
                    name="fast_ema",
                    label="Fast EMA Period",
                    param_type="int",
                    default=20,
                    min_value=3,
                    max_value=100,
                    step=1,
                    description="Period for the short-term Exponential Moving Average",
                ),
                ParameterDefinition(
                    name="slow_ema",
                    label="Slow EMA Period",
                    param_type="int",
                    default=50,
                    min_value=10,
                    max_value=300,
                    step=1,
                    description="Period for the long-term Exponential Moving Average",
                ),
                ParameterDefinition(
                    name="atr_period",
                    label="ATR Period",
                    param_type="int",
                    default=14,
                    min_value=5,
                    max_value=50,
                    step=1,
                    description="Lookback period for Average True Range volatility calculation",
                ),
            ],
        )

    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        price = event.close

        # Store prior bar state for crossover detection
        self._prev_fast_ema = self._fast_ema
        self._prev_slow_ema = self._slow_ema

        # Update online EMA values
        if self._fast_ema is None:
            self._fast_ema = price
        else:
            self._fast_ema = (price * self._fast_alpha) + (
                self._fast_ema * (1.0 - self._fast_alpha)
            )

        if self._slow_ema is None:
            self._slow_ema = price
        else:
            self._slow_ema = (price * self._slow_alpha) + (
                self._slow_ema * (1.0 - self._slow_alpha)
            )

        # Require at least one prior bar to evaluate transitions
        if self._prev_fast_ema is None or self._prev_slow_ema is None:
            return None

        # Bullish Crossover: Fast crosses above Slow
        if self._prev_fast_ema <= self._prev_slow_ema and self._fast_ema > self._slow_ema:
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=SignalType.LONG,
            )

        # Bearish Crossover: Fast crosses below Slow
        if self._prev_fast_ema >= self._prev_slow_ema and self._fast_ema < self._slow_ema:
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=SignalType.EXIT,
            )

        return None
