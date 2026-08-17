import pandas as pd

from src.analytics.metrics import max_drawdown, sharpe_ratio


def test_metrics_smoke() -> None:
    equity = pd.Series([100.0, 105.0, 102.0, 110.0])
    returns = equity.pct_change().dropna()
    assert isinstance(sharpe_ratio(returns), float)
    assert max_drawdown(equity) <= 0.0
