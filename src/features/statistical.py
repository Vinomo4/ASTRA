from __future__ import annotations

import pandas as pd


def zscore(series: pd.Series, window: int = 20) -> pd.Series:
    mean = series.rolling(window).mean()
    std = series.rolling(window).std(ddof=0)
    return (series - mean) / std.replace(0, pd.NA)


def realized_volatility(returns: pd.Series, window: int = 20) -> pd.Series:
    return returns.rolling(window).std(ddof=0) * (window**0.5)
