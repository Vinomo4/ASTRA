from __future__ import annotations

from collections import deque
from typing import Any

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.base_strategy import BaseStrategy, ParameterDefinition, StrategyMetadata
from src.strategies.registry import StrategyRegistry


@StrategyRegistry.register
class VolatilityBreakoutStrategy(BaseStrategy):
    id = "regime_volatility_breakout"
    name = "Regime-Filtered Volatility Breakout"
    description = (
        "Donchian breakout strategy filtered by ADX trend strength and "
        "relative volume expansion, with dynamic ATR volatility brackets."
    )
    category = "Rule-Based"

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self.channel_period = int(self.get_param("channel_period", 20))
        self.adx_period = int(self.get_param("adx_period", 14))
        self.adx_threshold = float(self.get_param("adx_threshold", 25.0))
        self.volume_ma_period = int(self.get_param("volume_ma_period", 20))
        self.volume_multiplier = float(self.get_param("volume_multiplier", 1.2))
        self.atr_period = int(self.get_param("atr_period", 14))

        # Point-in-time historical bar buffer
        max_buffer = max(self.channel_period, self.volume_ma_period, self.adx_period * 3) + 10
        self._history: deque[MarketDataEvent] = deque(maxlen=max_buffer)

    @classmethod
    def get_metadata(cls) -> StrategyMetadata:
        return StrategyMetadata(
            id=cls.id,
            name=cls.name,
            description=cls.description,
            category=cls.category,
            parameters=[
                ParameterDefinition(
                    name="channel_period",
                    label="Donchian Channel Period",
                    param_type="int",
                    default=20,
                    min_value=5,
                    max_value=100,
                    step=1,
                    description="Lookback window for high/low breakout boundaries",
                ),
                ParameterDefinition(
                    name="adx_period",
                    label="ADX Period",
                    param_type="int",
                    default=14,
                    min_value=5,
                    max_value=50,
                    step=1,
                    description="Lookback window for Average Directional Index",
                ),
                ParameterDefinition(
                    name="adx_threshold",
                    label="ADX Trend Filter Threshold",
                    param_type="float",
                    default=25.0,
                    min_value=10.0,
                    max_value=50.0,
                    step=1.0,
                    description="Minimum ADX value required to confirm active trend regime",
                ),
                ParameterDefinition(
                    name="volume_ma_period",
                    label="Volume MA Lookback",
                    param_type="int",
                    default=20,
                    min_value=5,
                    max_value=100,
                    step=1,
                    description="Moving average lookback for baseline volume comparison",
                ),
                ParameterDefinition(
                    name="volume_multiplier",
                    label="Volume Expansion Factor",
                    param_type="float",
                    default=1.2,
                    min_value=0.5,
                    max_value=3.0,
                    step=0.1,
                    description="Relative volume threshold required to confirm breakout momentum",
                ),
                ParameterDefinition(
                    name="atr_period",
                    label="ATR Volatility Period",
                    param_type="int",
                    default=14,
                    min_value=5,
                    max_value=50,
                    step=1,
                    description="Lookback period for dynamic Stop-Loss and Take-Profit calculations",
                ),
            ],
        )

    def _calculate_adx(self) -> float:
        """Computes current ADX over buffered bar history."""
        bars = list(self._history)
        if len(bars) < self.adx_period + 2:
            return 0.0

        highs = [b.high for b in bars]
        lows = [b.low for b in bars]
        closes = [b.close for b in bars]

        tr_list = []
        plus_dm_list = []
        minus_dm_list = []

        for i in range(1, len(bars)):
            h = highs[i]
            l = lows[i]
            prev_c = closes[i - 1]
            prev_h = highs[i - 1]
            prev_l = lows[i - 1]

            tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
            tr_list.append(tr)

            up_move = h - prev_h
            down_move = prev_l - l

            plus_dm = up_move if up_move > down_move and up_move > 0 else 0.0
            minus_dm = down_move if down_move > up_move and down_move > 0 else 0.0

            plus_dm_list.append(plus_dm)
            minus_dm_list.append(minus_dm)

        if len(tr_list) < self.adx_period:
            return 0.0

        alpha = 1.0 / self.adx_period
        smooth_tr = tr_list[0]
        smooth_pdm = plus_dm_list[0]
        smooth_mdm = minus_dm_list[0]

        dx_list = []
        for i in range(1, len(tr_list)):
            smooth_tr = (alpha * tr_list[i]) + ((1.0 - alpha) * smooth_tr)
            smooth_pdm = (alpha * plus_dm_list[i]) + ((1.0 - alpha) * smooth_pdm)
            smooth_mdm = (alpha * minus_dm_list[i]) + ((1.0 - alpha) * smooth_mdm)

            if smooth_tr > 0:
                pdi = 100.0 * (smooth_pdm / smooth_tr)
                mdi = 100.0 * (smooth_mdm / smooth_tr)
                di_sum = pdi + mdi
                dx = 100.0 * (abs(pdi - mdi) / di_sum) if di_sum > 0 else 0.0
                dx_list.append(dx)

        if not dx_list:
            return 0.0

        adx = dx_list[0]
        for dx in dx_list[1:]:
            adx = (alpha * dx) + ((1.0 - alpha) * adx)

        return float(adx)

    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        # Minimum history required to compute channels and volume benchmark
        min_required = max(self.channel_period, self.volume_ma_period)

        if len(self._history) < min_required:
            self._history.append(event)
            return None

        # 1. Donchian Boundaries (calculated strictly on completed historical bars to prevent lookahead)
        historical_bars = list(self._history)
        channel_slice = historical_bars[-self.channel_period :]
        donchian_high = max(b.high for b in channel_slice)
        donchian_low = min(b.low for b in channel_slice)
        donchian_mid = (donchian_high + donchian_low) / 2.0

        # 2. Relative Volume Expansion
        vol_slice = historical_bars[-self.volume_ma_period :]
        volume_ma = sum(b.volume for b in vol_slice) / len(vol_slice)
        volume_confirmed = event.volume >= (volume_ma * self.volume_multiplier)

        # 3. Append current bar to history buffer
        self._history.append(event)

        # 4. Trend Strength Filter (ADX)
        adx_value = self._calculate_adx()

        # 5. Signal Evaluation
        # Long Entry: Breakout above prior Donchian High + Trending Market + Volume Spike
        if event.close > donchian_high and adx_value >= self.adx_threshold and volume_confirmed:
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=SignalType.LONG,
            )

        # Exit: Price crosses below mid-channel
        if event.close < donchian_mid:
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=SignalType.EXIT,
            )

        return None
