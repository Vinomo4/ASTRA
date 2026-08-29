"""Event sampling and triple-barrier labeling utilities."""

from __future__ import annotations

import numpy as np
import pandas as pd


def get_daily_volatility(close: pd.Series, span: int = 20) -> pd.Series:
    """Compute exponentially weighted volatility from log returns.

    Args:
        close: Price series indexed by timestamps.
        span: Exponentially weighted moving-window span.

    Returns:
        Bar-to-bar volatility estimates aligned with ``close``.
    """
    returns = np.log(close / close.shift(1))
    vol = returns.ewm(span=span).std()
    return vol.bfill().ffill()


def cusum_filter(close: pd.Series, threshold: float | pd.Series) -> pd.DatetimeIndex:
    """Sample events with a symmetric cumulative sum filter.

    An event is emitted when cumulative log-price divergence exceeds the
    corresponding fixed or dynamic volatility threshold.

    Args:
        close: Close-price series indexed by timestamps.
        threshold: Fixed threshold or timestamp-aligned threshold series.

    Returns:
        Timestamps that trigger sampling events.
    """
    events: list[pd.Timestamp] = []
    s_pos = 0.0
    s_neg = 0.0

    returns = np.log(close / close.shift(1)).fillna(0.0)
    is_threshold_series = isinstance(threshold, pd.Series)

    for dt, ret in returns.items():
        th = float(threshold.loc[dt]) if is_threshold_series else float(threshold)
        s_pos = max(0.0, s_pos + ret)
        s_neg = min(0.0, s_neg + ret)

        if s_neg < -th:
            s_neg = 0.0
            events.append(dt)
        elif s_pos > th:
            s_pos = 0.0
            events.append(dt)

    return pd.DatetimeIndex(events)


def add_vertical_barriers(
    event_timestamps: pd.DatetimeIndex, close: pd.Series, num_bars: int = 10
) -> pd.Series:
    """Compute holding-period expiration timestamps for sampled events.

    Args:
        event_timestamps: Sampled event start times.
        close: Price series whose index defines the available bars.
        num_bars: Number of forward bars in each holding window.

    Returns:
        Event timestamps mapped to their vertical-barrier timestamps.
    """
    close_idx = close.index
    barriers: dict[pd.Timestamp, pd.Timestamp] = {}

    for dt in event_timestamps:
        loc = close_idx.get_indexer([dt])[0]
        if loc != -1:
            expiry_loc = min(loc + num_bars, len(close_idx) - 1)
            barriers[dt] = close_idx[expiry_loc]

    return pd.Series(barriers, dtype=close_idx.dtype)


def triple_barrier_labeling(
    close: pd.Series,
    events: pd.DatetimeIndex,
    pt_sl: list[float],
    target: pd.Series,
    vertical_barrier: pd.Series | None = None,
    min_ret: float = 0.0005,
) -> pd.DataFrame:
    """Label events according to the first barrier touched.

    Each event is evaluated against an upper take-profit barrier, a lower
    stop-loss barrier, and an optional vertical time barrier.

    Args:
        close: Price series indexed by timestamps.
        events: Trade-entry decision timestamps.
        pt_sl: Take-profit and stop-loss multipliers, in that order.
        target: Dynamic barrier scale for each event.
        vertical_barrier: Optional event-to-expiration timestamp mapping.
        min_ret: Minimum absolute return for a nonzero vertical-barrier label.

    Returns:
        A data frame indexed by event with ``t1`` first-touch timestamps,
        ``ret`` realized fractional returns, and ``bin`` labels in
        ``{-1, 0, 1}``.
    """
    out = pd.DataFrame(index=events, columns=["t1", "ret", "bin"], dtype=object)

    pt_mult, sl_mult = pt_sl[0], pt_sl[1]

    for dt in events:
        if dt not in close.index:
            continue

        tgt = float(target.loc[dt]) if dt in target.index else 0.0
        if tgt <= 0.0:
            continue

        if vertical_barrier is not None and dt in vertical_barrier.index:
            end_dt = vertical_barrier.loc[dt]
            path = close.loc[dt:end_dt]
        else:
            path = close.loc[dt:]

        if len(path) <= 1:
            continue

        entry_price = path.iloc[0]
        returns = (path / entry_price) - 1.0

        upper_barrier = pt_mult * tgt if pt_mult > 0 else np.nan
        lower_barrier = -sl_mult * tgt if sl_mult > 0 else np.nan

        earliest_pt = (
            returns[returns >= upper_barrier].index.min() if not np.isnan(upper_barrier) else pd.NaT
        )
        earliest_sl = (
            returns[returns <= lower_barrier].index.min() if not np.isnan(lower_barrier) else pd.NaT
        )

        candidates = [t for t in [earliest_pt, earliest_sl] if pd.notna(t)]

        if candidates:
            first_touch_dt = min(candidates)
            realized_ret = float(returns.loc[first_touch_dt])
            label = 1 if first_touch_dt == earliest_pt else -1
        else:
            first_touch_dt = path.index[-1]
            realized_ret = float(returns.iloc[-1])
            if abs(realized_ret) < min_ret:
                label = 0
            else:
                label = int(np.sign(realized_ret))

        out.loc[dt, "t1"] = first_touch_dt
        out.loc[dt, "ret"] = realized_ret
        out.loc[dt, "bin"] = label

    out = out.dropna(subset=["bin"]).copy()
    out["ret"] = out["ret"].astype(float)
    out["bin"] = out["bin"].astype(int)
    return out
