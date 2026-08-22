# src/strategies/custom_rule_strategy.py
from __future__ import annotations

from collections import deque
from typing import Any

import numpy as np

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.base_strategy import BaseStrategy, ParameterDefinition, StrategyMetadata
from src.strategies.registry import StrategyRegistry


@StrategyRegistry.register
class CustomRuleStrategy(BaseStrategy):
    id = "custom_rule_strategy"
    name = "Custom Rule-Based Constructor"
    description = "User-defined multi-condition strategy using dynamic technical indicators and comparison rules."
    category = "Rule-Based"

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        # Entry / Exit rules passed as condition lists
        self.entry_rules: list[dict[str, Any]] = self.get_param(
            "entry_rules", [{"indicator_a": "close", "operator": ">", "indicator_b": "ema_fast"}]
        )
        self.exit_rules: list[dict[str, Any]] = self.get_param(
            "exit_rules", [{"indicator_a": "close", "operator": "<", "indicator_b": "ema_slow"}]
        )

        # Rolling indicators configuration
        self.fast_period = int(self.get_param("fast_period", 20))
        self.slow_period = int(self.get_param("slow_period", 50))
        self.rsi_period = int(self.get_param("rsi_period", 14))

        max_history = max(self.slow_period, self.fast_period, self.rsi_period * 3, 200) + 20
        self._history: deque[MarketDataEvent] = deque(maxlen=max_history)

    @classmethod
    def get_metadata(cls) -> StrategyMetadata:
        return StrategyMetadata(
            id=cls.id,
            name=cls.name,
            description=cls.description,
            category=cls.category,
            parameters=[
                ParameterDefinition(
                    name="fast_period",
                    label="Fast Period (EMA/SMA)",
                    param_type="int",
                    default=20,
                    min_value=3,
                    max_value=100,
                    description="Lookback for the fast moving average",
                ),
                ParameterDefinition(
                    name="slow_period",
                    label="Slow Period (EMA/SMA)",
                    param_type="int",
                    default=50,
                    min_value=10,
                    max_value=300,
                    description="Lookback for the slow moving average baseline",
                ),
                ParameterDefinition(
                    name="rsi_period",
                    label="RSI Period",
                    param_type="int",
                    default=14,
                    min_value=5,
                    max_value=50,
                    description="Lookback for Relative Strength Index",
                ),
            ],
        )

    def _compute_indicators(self) -> dict[str, float]:
        """Calculates current point-in-time values for all available indicators."""
        bars = list(self._history)
        closes = np.array([b.close for b in bars], dtype=float)
        highs = np.array([b.high for b in bars], dtype=float)
        lows = np.array([b.low for b in bars], dtype=float)
        volumes = np.array([b.volume for b in bars], dtype=float)

        last_close = closes[-1]
        indicators: dict[str, float] = {
            "close": last_close,
            "open": bars[-1].open,
            "high": bars[-1].high,
            "low": bars[-1].low,
            "volume": bars[-1].volume,
        }

        # 1. EMAs
        if len(closes) >= self.fast_period:
            weights = np.exp(np.linspace(-1.0, 0.0, self.fast_period))
            weights /= weights.sum()
            indicators["ema_fast"] = float(
                np.convolve(closes[-self.fast_period :], weights[::-1], mode="valid")[0]
            )
        else:
            indicators["ema_fast"] = last_close

        if len(closes) >= self.slow_period:
            weights = np.exp(np.linspace(-1.0, 0.0, self.slow_period))
            weights /= weights.sum()
            indicators["ema_slow"] = float(
                np.convolve(closes[-self.slow_period :], weights[::-1], mode="valid")[0]
            )
        else:
            indicators["ema_slow"] = last_close

        # 2. RSI
        if len(closes) > self.rsi_period + 1:
            diffs = np.diff(closes[-(self.rsi_period + 1) :])
            gains = np.maximum(diffs, 0)
            losses = np.maximum(-diffs, 0)
            avg_gain = gains.mean()
            avg_loss = losses.mean()
            if avg_loss == 0:
                indicators["rsi"] = 100.0
            else:
                rs = avg_gain / avg_loss
                indicators["rsi"] = float(100.0 - (100.0 / (1.0 + rs)))
        else:
            indicators["rsi"] = 50.0

        # 3. Donchian Channels (evaluated on historical bars prior to current bar)
        if len(bars) > self.fast_period:
            indicators["donchian_high"] = float(highs[-(self.fast_period + 1) : -1].max())
            indicators["donchian_low"] = float(lows[-(self.fast_period + 1) : -1].min())
        else:
            indicators["donchian_high"] = last_close
            indicators["donchian_low"] = last_close

        # 4. Volume MA
        if len(volumes) >= self.fast_period:
            indicators["volume_ma"] = float(volumes[-self.fast_period :].mean())
        else:
            indicators["volume_ma"] = bars[-1].volume

        return indicators

    def _evaluate_rule(self, rule: dict[str, Any], indicators: dict[str, float]) -> bool:
        """Evaluates a single relational condition predicate."""
        op = rule.get("operator", ">")
        var_a = rule.get("indicator_a", "close")
        var_b = rule.get("indicator_b", "")
        threshold = rule.get("threshold", None)

        val_a = indicators.get(var_a, None)
        if val_a is None:
            return False

        if threshold is not None and str(threshold).strip() != "":
            val_b = float(threshold)
        else:
            val_b = indicators.get(var_b, None)

        if val_b is None:
            return False

        if op == ">":
            return val_a > val_b
        elif op == "<":
            return val_a < val_b
        elif op == ">=":
            return val_a >= val_b
        elif op == "<=":
            return val_a <= val_b
        elif op == "==":
            return abs(val_a - val_b) < 1e-5
        return False

    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        self._history.append(event)
        min_bars = max(self.slow_period, self.rsi_period + 1, self.fast_period)
        if len(self._history) < min_bars:
            return None

        indicators = self._compute_indicators()

        # Check Entry Conditions (ALL rules must be satisfied - Logical AND)
        if self.entry_rules and all(self._evaluate_rule(r, indicators) for r in self.entry_rules):
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=SignalType.LONG,
            )

        # Check Exit Conditions
        if self.exit_rules and any(self._evaluate_rule(r, indicators) for r in self.exit_rules):
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=SignalType.EXIT,
            )

        return None
