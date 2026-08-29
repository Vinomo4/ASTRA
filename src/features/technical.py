"""Calculate technical indicators from OHLCV market data."""

from __future__ import annotations

import pandas as pd


class TechnicalFeatures:
    """Group technical-indicator calculations for market data."""

    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate the simple moving average of true range.

        Args:
            df: Market data containing high, low, and close columns.
            period: Rolling lookback period.

        Returns:
            Average true range values aligned to the input index.

        Raises:
            KeyError: If a required price column is missing.
            ValueError: If the rolling period is invalid.
        """
        high = df["high"]
        low = df["low"]
        close_prev = df["close"].shift(1)

        tr1 = high - low
        tr2 = (high - close_prev).abs()
        tr3 = (low - close_prev).abs()

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(window=period, min_periods=period).mean()

    @staticmethod
    def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate the relative strength index.

        Args:
            df: Market data containing a close column.
            period: Rolling lookback period.

        Returns:
            Relative strength index values aligned to the input index.

        Raises:
            KeyError: If the close column is missing.
            ValueError: If the rolling period is invalid.
        """
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0.0).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0.0)).rolling(window=period).mean()

        rs = gain / (loss + 1e-9)
        return 100 - (100 / (1 + rs))


def rsi(close: pd.Series, window: int = 14) -> pd.Series:
    """Calculate the relative strength index from closing prices.

    Args:
        close: Closing-price series.
        window: Rolling lookback period.

    Returns:
        Relative strength index values aligned to the input index.

    Raises:
        ValueError: If the rolling window is invalid.
    """
    return TechnicalFeatures.calculate_rsi(pd.DataFrame({"close": close}), period=window)


def atr(high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14) -> pd.Series:
    """Calculate average true range from price series.

    Args:
        high: High-price series.
        low: Low-price series.
        close: Closing-price series.
        window: Rolling lookback period.

    Returns:
        Average true range values aligned to the input index.

    Raises:
        ValueError: If the rolling window is invalid.
    """
    return TechnicalFeatures.calculate_atr(
        pd.DataFrame({"high": high, "low": low, "close": close}), period=window
    )


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    """Calculate moving average convergence divergence values.

    Args:
        close: Closing-price series.
        fast: Span of the fast exponential moving average.
        slow: Span of the slow exponential moving average.
        signal: Span of the signal-line exponential moving average.

    Returns:
        A data frame containing MACD, signal, and histogram columns.

    Raises:
        ValueError: If an exponential moving-average span is invalid.
    """
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return pd.DataFrame({"macd": macd_line, "signal": signal_line, "histogram": histogram})


__all__ = ["TechnicalFeatures", "atr", "macd", "rsi"]
