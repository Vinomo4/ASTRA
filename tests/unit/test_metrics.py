# tests/unit/test_metrics.py
import pandas as pd

from src.analytics.metrics import PerformanceAnalytics


def test_metrics_smoke() -> None:
    # 1. Equity Series Test Data
    dates = pd.date_range("2023-01-01", periods=4, freq="D")
    equity = pd.Series([100.0, 105.0, 102.0, 110.0], index=dates)

    # 2. Sharpe Ratio
    sharpe = PerformanceAnalytics.calculate_sharpe_ratio(equity)
    assert isinstance(sharpe, float)

    # 3. Maximum Drawdown
    max_dd, dd_series = PerformanceAnalytics.calculate_max_drawdown(equity)
    assert isinstance(max_dd, float)
    assert max_dd >= 0.0
    assert (dd_series <= 0.0).all()

    # Peak was 105.0, trough was 102.0 -> Drawdown = (102 - 105) / 105 = -0.02857...
    expected_dd = (105.0 - 102.0) / 105.0
    assert abs(max_dd - expected_dd) < 1e-4

    # 4. CAGR Calculation
    cagr = PerformanceAnalytics.calculate_cagr(equity)
    assert isinstance(cagr, float)
    assert cagr > 0.0

    # 5. Sortino Ratio
    sortino = PerformanceAnalytics.calculate_sortino_ratio(equity)
    assert isinstance(sortino, float)
