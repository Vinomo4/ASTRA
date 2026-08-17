from __future__ import annotations

import numpy as np
import pandas as pd


class PerformanceAnalytics:
    @staticmethod
    def calculate_sharpe_ratio(equity_curve: pd.Series, risk_free_rate: float = 0.02) -> float:
        returns = equity_curve.pct_change().dropna()
        if len(returns) < 2 or returns.std() == 0:
            return 0.0
        rf_daily = (1 + risk_free_rate) ** (1 / 252) - 1
        excess_returns = returns - rf_daily
        return float(np.sqrt(252) * excess_returns.mean() / (returns.std() + 1e-9))

    @staticmethod
    def calculate_sortino_ratio(equity_curve: pd.Series, risk_free_rate: float = 0.02) -> float:
        returns = equity_curve.pct_change().dropna()
        if len(returns) < 2:
            return 0.0
        rf_daily = (1 + risk_free_rate) ** (1 / 252) - 1
        excess_returns = returns - rf_daily
        downside_returns = returns[returns < 0]
        downside_std = downside_returns.std()
        if downside_std == 0 or np.isnan(downside_std):
            return 0.0
        return float(np.sqrt(252) * excess_returns.mean() / downside_std)

    @staticmethod
    def calculate_max_drawdown(equity_curve: pd.Series) -> tuple[float, pd.Series]:
        peak = equity_curve.cummax()
        drawdown = (equity_curve - peak) / peak
        max_drawdown = float(drawdown.min())
        return max_drawdown, drawdown

    @staticmethod
    def calculate_cagr(equity_curve: pd.Series, periods_per_year: int = 252) -> float:
        if len(equity_curve) < 2:
            return 0.0
        total_periods = len(equity_curve)
        years = total_periods / periods_per_year
        initial_val = equity_curve.iloc[0]
        final_val = equity_curve.iloc[-1]
        if initial_val <= 0:
            return 0.0
        return float((final_val / initial_val) ** (1 / years) - 1)


def sharpe_ratio(returns: pd.Series, periods_per_year: int = 252) -> float:
    std = returns.std(ddof=0)
    if std == 0 or pd.isna(std):
        return 0.0
    return float(np.sqrt(periods_per_year) * returns.mean() / std)


def sortino_ratio(returns: pd.Series, periods_per_year: int = 252) -> float:
    downside = returns[returns < 0]
    downside_std = downside.std(ddof=0)
    if downside_std == 0 or pd.isna(downside_std):
        return 0.0
    return float(np.sqrt(periods_per_year) * returns.mean() / downside_std)


def max_drawdown(equity_curve: pd.Series) -> float:
    running_max = equity_curve.cummax()
    drawdown = equity_curve / running_max - 1.0
    return float(drawdown.min())
