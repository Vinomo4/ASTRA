# src/strategies/mean_reversion.py
from __future__ import annotations

from collections import deque
from typing import Any

import numpy as np

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.base_strategy import BaseStrategy, ParameterDefinition, StrategyMetadata
from src.strategies.registry import StrategyRegistry


@StrategyRegistry.register
class MeanReversionStrategy(BaseStrategy):
    id = "statistical_mean_reversion"
    name = "Statistical Z-Score Mean Reversion"
    description = (
        "Statistical mean reversion exploiting standard deviation deviations (Z-score) "
        "and short-term RSI extremes, strictly gated by an ADX non-trending regime filter."
    )
    category = "Rule-Based"

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self.lookback_period = int(self.get_param("lookback_period", 20))
        self.z_entry_threshold = float(self.get_param("z_entry_threshold", -2.0))
        self.z_exit_threshold = float(self.get_param("z_exit_threshold", 0.0))
        self.rsi_period = int(self.get_param("rsi_period", 2))
        self.rsi_entry_threshold = float(self.get_param("rsi_entry_threshold", 15.0))
        self.adx_period = int(self.get_param("adx_period", 14))
        self.adx_max_regime = float(self.get_param("adx_max_regime", 22.0))
        self.atr_period = int(self.get_param("atr_period", 14))
        self.atr_sl_mult = float(self.get_param("atr_sl_mult", 2.0))

        max_buffer = max(self.lookback_period, self.adx_period * 3, self.atr_period, 50) + 15
        self._history: deque[MarketDataEvent] = deque(maxlen=max_buffer)
        self._in_position: bool = False

    @classmethod
    def get_metadata(cls) -> StrategyMetadata:
        return StrategyMetadata(
            id=cls.id,
            name=cls.name,
            description=cls.description,
            category=cls.category,
            parameters=[
                ParameterDefinition(
                    name="lookback_period",
                    label="Z-Score Lookback Period",
                    param_type="int",
                    default=20,
                    min_value=5,
                    max_value=100,
                    step=1,
                    description="Rolling window for mean baseline and standard deviation calculation",
                ),
                ParameterDefinition(
                    name="z_entry_threshold",
                    label="Z-Score Long Entry",
                    param_type="float",
                    default=-2.0,
                    min_value=-4.0,
                    max_value=-0.5,
                    step=0.1,
                    description="Number of standard deviations below the mean to trigger an oversold long entry",
                ),
                ParameterDefinition(
                    name="z_exit_threshold",
                    label="Z-Score Target Exit",
                    param_type="float",
                    default=0.0,
                    min_value=-1.0,
                    max_value=2.0,
                    step=0.1,
                    description="Standardized deviation level to take profits upon mean reversion",
                ),
                ParameterDefinition(
                    name="rsi_period",
                    label="RSI Lookback Period",
                    param_type="int",
                    default=2,
                    min_value=2,
                    max_value=14,
                    step=1,
                    description="Short-term Connors-style RSI period for extreme oversold confirmation",
                ),
                ParameterDefinition(
                    name="rsi_entry_threshold",
                    label="RSI Max Threshold",
                    param_type="float",
                    default=15.0,
                    min_value=5.0,
                    max_value=40.0,
                    step=1.0,
                    description="Maximum RSI value allowed to enter long (confirming capitulation)",
                ),
                ParameterDefinition(
                    name="adx_max_regime",
                    label="ADX Maximum Regime Gate",
                    param_type="float",
                    default=22.0,
                    min_value=10.0,
                    max_value=35.0,
                    step=1.0,
                    description="Max trend strength allowed (blocks trading during strong directional trends)",
                ),
            ],
        )

    def _compute_z_score(self, closes: np.ndarray) -> float:
        window = closes[-self.lookback_period :]
        mean = float(np.mean(window))
        std = float(np.std(window))
        if std < 1e-8:
            return 0.0
        return (float(closes[-1]) - mean) / std

    def _compute_rsi(self, closes: np.ndarray) -> float:
        if len(closes) < self.rsi_period + 1:
            return 50.0
        diffs = np.diff(closes[-(self.rsi_period + 1) :])
        gains = np.maximum(diffs, 0)
        losses = np.maximum(-diffs, 0)
        avg_gain = float(np.mean(gains))
        avg_loss = float(np.mean(losses))
        if avg_loss < 1e-8:
            return 100.0 if avg_gain > 0 else 50.0
        rs = avg_gain / avg_loss
        return float(100.0 - (100.0 / (1.0 + rs)))

    # src/strategies/mean_reversion.py

    def _compute_adx_and_atr(
        self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray
    ) -> tuple[float, float]:
        n = len(closes)
        if n < self.adx_period + 2:
            return 0.0, float(highs[-1] - lows[-1])

        tr1 = highs[1:] - lows[1:]
        tr2 = np.abs(highs[1:] - closes[:-1])
        tr3 = np.abs(lows[1:] - closes[:-1])
        tr = np.maximum(tr1, np.maximum(tr2, tr3))

        atr = (
            float(np.mean(tr[-self.atr_period :]))
            if len(tr) >= self.atr_period
            else float(np.mean(tr))
        )

        up_move = highs[1:] - highs[:-1]
        down_move = lows[:-1] - lows[1:]

        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

        p = self.adx_period
        if len(tr) < p:
            return 0.0, atr

        dx_series: list[float] = []
        for i in range(p, len(tr) + 1):
            sub_tr = float(np.sum(tr[i - p : i]))
            if sub_tr < 1e-8:
                dx_series.append(0.0)
                continue
            sub_plus_di = 100.0 * (float(np.sum(plus_dm[i - p : i])) / sub_tr)
            sub_minus_di = 100.0 * (float(np.sum(minus_dm[i - p : i])) / sub_tr)
            denom = sub_plus_di + sub_minus_di
            if denom < 1e-8:
                dx_series.append(0.0)
            else:
                dx_series.append(100.0 * abs(sub_plus_di - sub_minus_di) / denom)

        if not dx_series:
            return 0.0, atr

        adx = float(np.mean(dx_series[-p:])) if len(dx_series) >= p else float(np.mean(dx_series))
        return adx, atr

    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        self._history.append(event)
        min_bars = max(self.lookback_period, self.adx_period + 2, self.rsi_period + 2)
        if len(self._history) < min_bars:
            return None

        bars = list(self._history)
        closes = np.array([b.close for b in bars], dtype=float)
        highs = np.array([b.high for b in bars], dtype=float)
        lows = np.array([b.low for b in bars], dtype=float)

        z_score = self._compute_z_score(closes)
        rsi = self._compute_rsi(closes)
        adx, atr = self._compute_adx_and_atr(highs, lows, closes)

        # 1. Exit Evaluation
        if self._in_position:
            # Take profit when price reverts to mean (Z >= 0) or extreme trend begins
            if z_score >= self.z_exit_threshold:
                self._in_position = False
                return SignalEvent(
                    timestamp=event.timestamp,
                    symbol=event.symbol,
                    signal_type=SignalType.EXIT,
                    strategy_id=self.id,
                )

        # 2. Long Entry Evaluation
        # Conditions: (1) Price extended below lower Z-threshold, (2) Extreme RSI oversold, (3) Market not in macro trend (ADX < threshold)
        if not self._in_position:
            if (
                z_score <= self.z_entry_threshold
                and rsi <= self.rsi_entry_threshold
                and adx <= self.adx_max_regime
            ):
                self._in_position = True
                stop_loss = event.close - (self.atr_sl_mult * atr)
                return SignalEvent(
                    timestamp=event.timestamp,
                    symbol=event.symbol,
                    signal_type=SignalType.LONG,
                    strategy_id=self.id,
                    stop_loss=stop_loss,
                )

        return None
