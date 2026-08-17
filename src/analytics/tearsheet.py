from __future__ import annotations

import pandas as pd

from src.analytics.metrics import max_drawdown, sharpe_ratio, sortino_ratio


def build_tearsheet(equity_curve: pd.Series) -> dict[str, float]:
    returns = equity_curve.pct_change().dropna()
    return {
        "sharpe": sharpe_ratio(returns),
        "sortino": sortino_ratio(returns),
        "max_drawdown": max_drawdown(equity_curve),
    }
