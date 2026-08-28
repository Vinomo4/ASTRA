# src/analytics/metrics.py
from __future__ import annotations

import numpy as np
import pandas as pd


class PerformanceAnalytics:
    TRADING_DAYS_EQUITIES = 252
    TRADING_DAYS_CRYPTO = 365

    @staticmethod
    def _to_daily_equity(equity_series: pd.Series) -> pd.Series:
        """Converts any timeframe equity curve (1d, 4h, 1h) into a daily close series."""
        if equity_series.empty or len(equity_series) < 2:
            return equity_series

        s = equity_series.copy()
        if not isinstance(s.index, pd.DatetimeIndex):
            s.index = pd.to_datetime(s.index, utc=True)
        elif s.index.tz is None:
            s.index = s.index.tz_localize("UTC")
        else:
            s.index = s.index.tz_convert("UTC")

        # Reagrupación a fin de día UTC para homogeneizar el cálculo de retornos
        daily = s.resample("1D").last().ffill().dropna()
        return daily

    @staticmethod
    def calculate_cagr(equity_series: pd.Series) -> float:
        if equity_series.empty or len(equity_series) < 2:
            return 0.0
        start_val = equity_series.iloc[0]
        end_val = equity_series.iloc[-1]
        if start_val <= 0 or end_val <= 0:
            return 0.0

        start_date = pd.to_datetime(equity_series.index[0])
        end_date = pd.to_datetime(equity_series.index[-1])
        years = (end_date - start_date).total_seconds() / (365.25 * 86400.0)
        if years <= 0:
            return 0.0
        return float((end_val / start_val) ** (1.0 / years) - 1.0)

    @staticmethod
    def calculate_max_drawdown(equity_series: pd.Series) -> tuple[float, pd.Series]:
        if equity_series.empty:
            return 0.0, pd.Series(dtype=float)
        cumulative_max = equity_series.cummax()
        drawdown_series = (equity_series - cumulative_max) / cumulative_max
        max_dd = float(drawdown_series.min()) if not drawdown_series.empty else 0.0
        return abs(max_dd), drawdown_series

    @staticmethod
    def calculate_sharpe_ratio(
        equity_series: pd.Series,
        risk_free_rate: float = 0.0,
        periods_per_year: int = 365,
    ) -> float:
        daily_equity = PerformanceAnalytics._to_daily_equity(equity_series)
        if daily_equity.empty or len(daily_equity) < 2:
            return 0.0

        daily_returns = daily_equity.pct_change().dropna()
        if daily_returns.empty or daily_returns.std() == 0:
            return 0.0

        rf_daily = (1.0 + risk_free_rate) ** (1.0 / periods_per_year) - 1.0
        excess_returns = daily_returns - rf_daily
        sharpe = (excess_returns.mean() / daily_returns.std()) * np.sqrt(periods_per_year)
        return float(np.nan_to_num(sharpe))

    @staticmethod
    def calculate_sortino_ratio(
        equity_series: pd.Series,
        risk_free_rate: float = 0.0,
        periods_per_year: int = 365,
    ) -> float:
        daily_equity = PerformanceAnalytics._to_daily_equity(equity_series)
        if daily_equity.empty or len(daily_equity) < 2:
            return 0.0

        daily_returns = daily_equity.pct_change().dropna()
        if daily_returns.empty:
            return 0.0

        rf_daily = (1.0 + risk_free_rate) ** (1.0 / periods_per_year) - 1.0
        excess_returns = daily_returns - rf_daily
        downside_returns = daily_returns[daily_returns < 0]
        if downside_returns.empty or downside_returns.std() == 0:
            return 0.0

        sortino = (excess_returns.mean() / downside_returns.std()) * np.sqrt(periods_per_year)
        return float(np.nan_to_num(sortino))

    @staticmethod
    def calculate_calmar_ratio(cagr: float, max_drawdown_pct: float) -> float:
        if abs(max_drawdown_pct) < 1e-6:
            return 0.0 if cagr <= 0 else 999.99
        return float(cagr / abs(max_drawdown_pct))

    @staticmethod
    def calculate_alpha_beta(
        strategy_equity: pd.Series,
        benchmark_equity: pd.Series,
        risk_free_rate: float = 0.0,
        periods_per_year: int = 365,
    ) -> tuple[float, float]:
        """Calcula el Alpha anualizado y la Beta de la estrategia respecto al benchmark."""
        strat_daily = PerformanceAnalytics._to_daily_equity(strategy_equity)
        bench_daily = PerformanceAnalytics._to_daily_equity(benchmark_equity)

        if strat_daily.empty or bench_daily.empty or len(strat_daily) < 2 or len(bench_daily) < 2:
            return 0.0, 1.0

        strat_ret = strat_daily.pct_change().dropna()
        bench_ret = bench_daily.pct_change().dropna()

        combined = pd.DataFrame({"strategy": strat_ret, "benchmark": bench_ret}).dropna()
        if len(combined) < 2:
            return 0.0, 1.0

        cov_matrix = np.cov(combined["strategy"], combined["benchmark"])
        bench_var = cov_matrix[1, 1]

        if bench_var <= 0 or np.isnan(bench_var):
            beta = 1.0
        else:
            beta = float(cov_matrix[0, 1] / bench_var)

        rf_daily = (1.0 + risk_free_rate) ** (1.0 / periods_per_year) - 1.0
        strat_excess_mean = float((combined["strategy"] - rf_daily).mean()) * periods_per_year
        bench_excess_mean = float((combined["benchmark"] - rf_daily).mean()) * periods_per_year

        alpha = float(strat_excess_mean - beta * bench_excess_mean)
        return float(np.nan_to_num(alpha)), float(np.nan_to_num(beta))

    @staticmethod
    def calculate_trade_statistics(trades: list[object]) -> dict[str, float]:
        if not trades:
            return {
                "win_rate_pct": 0.0,
                "profit_factor": 0.0,
                "payoff_ratio": 0.0,
                "expectancy": 0.0,
                "avg_win": 0.0,
                "avg_loss": 0.0,
                "avg_trade_duration_days": 0.0,
                "max_consecutive_wins": 0,
                "max_consecutive_losses": 0,
            }

        pnls = [getattr(t, "pnl", 0.0) for t in trades]
        durations = []
        for t in trades:
            e_time = pd.to_datetime(getattr(t, "entry_time", None))
            x_time = pd.to_datetime(getattr(t, "exit_time", None))
            if e_time and x_time:
                durations.append(max((x_time - e_time).days, 1))

        wins = [p for p in pnls if p > 0]
        losses = [p for p in pnls if p < 0]

        total_trades = len(pnls)
        win_count = len(wins)
        loss_count = len(losses)

        win_rate = (win_count / total_trades) * 100.0 if total_trades > 0 else 0.0
        avg_win = float(np.mean(wins)) if wins else 0.0
        avg_loss = float(abs(np.mean(losses))) if losses else 0.0

        gross_profits = sum(wins)
        gross_losses = abs(sum(losses))

        profit_factor = (
            float(gross_profits / gross_losses)
            if gross_losses > 0
            else (float("inf") if gross_profits > 0 else 0.0)
        )
        payoff_ratio = float(avg_win / avg_loss) if avg_loss > 0 else 0.0

        prob_win = win_count / total_trades if total_trades > 0 else 0.0
        prob_loss = loss_count / total_trades if total_trades > 0 else 0.0
        expectancy = float((prob_win * avg_win) - (prob_loss * avg_loss))

        max_c_wins = 0
        max_c_losses = 0
        curr_wins = 0
        curr_losses = 0

        for p in pnls:
            if p > 0:
                curr_wins += 1
                curr_losses = 0
                max_c_wins = max(max_c_wins, curr_wins)
            elif p < 0:
                curr_losses += 1
                curr_wins = 0
                max_c_losses = max(max_c_losses, curr_losses)
            else:
                curr_wins = 0
                curr_losses = 0

        return {
            "win_rate_pct": round(win_rate, 2),
            "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else 999.99,
            "payoff_ratio": round(payoff_ratio, 2),
            "expectancy": round(expectancy, 2),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "avg_trade_duration_days": round(float(np.mean(durations)), 1) if durations else 0.0,
            "max_consecutive_wins": int(max_c_wins),
            "max_consecutive_losses": int(max_c_losses),
        }
