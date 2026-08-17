from __future__ import annotations

import pandas as pd


def volatility_regime(close: pd.Series, window: int = 20) -> pd.Series:
    vol = close.pct_change().rolling(window).std(ddof=0)
    low = vol.quantile(0.33)
    high = vol.quantile(0.66)
    labels = pd.Series(index=vol.index, dtype="object")
    labels[vol <= low] = "low_vol"
    labels[(vol > low) & (vol <= high)] = "mid_vol"
    labels[vol > high] = "high_vol"
    return labels
