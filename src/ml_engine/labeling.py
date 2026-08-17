from __future__ import annotations

import pandas as pd


def apply_triple_barrier(
    prices: pd.Series,
    events: pd.DataFrame,
    pt_sl: list[float],
    target: pd.Series,
    max_holding_period: int,
) -> pd.DataFrame:
    out = events[["timestamp"]].copy()
    out["take_profit"] = out["timestamp"]
    out["stop_loss"] = out["timestamp"]
    out["time_limit"] = out["timestamp"] + pd.to_timedelta(max_holding_period, unit="D")
    out["label"] = 0
    return out
