"""Bootstrap simulation of realized trade outcomes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from src.core.models import TradeRecord


@dataclass
class MonteCarloOutput:
    """Store aggregate risk estimates and simulated equity confidence bands.

    Attributes:
        num_simulations: Number of bootstrap paths evaluated.
        trade_count: Number of trades sampled per path.
        median_max_dd_pct: Median maximum path drawdown percentage.
        p90_max_dd_pct: 90th percentile maximum drawdown percentage.
        p95_max_dd_pct: 95th percentile maximum drawdown percentage.
        p99_max_dd_pct: 99th percentile maximum drawdown percentage.
        risk_of_ruin_pct: Percentage of paths that reach the ruin threshold.
        ruin_threshold_pct: Drawdown percentage defining ruin.
        var_95_pct: Fifth percentile of realized trade returns.
        cvar_95_pct: Mean realized return at or below the 95% VaR threshold.
        var_99_pct: First percentile of realized trade returns.
        cvar_99_pct: Mean realized return at or below the 99% VaR threshold.
        confidence_bands: Equity percentiles for each simulated trade step.
    """

    num_simulations: int
    trade_count: int
    median_max_dd_pct: float
    p90_max_dd_pct: float
    p95_max_dd_pct: float
    p99_max_dd_pct: float
    risk_of_ruin_pct: float
    ruin_threshold_pct: float
    var_95_pct: float
    cvar_95_pct: float
    var_99_pct: float
    cvar_99_pct: float
    confidence_bands: list[dict[str, Any]]


class MonteCarloSimulator:
    """Bootstrap realized trades to estimate equity-path risk."""

    def __init__(
        self,
        num_simulations: int = 1_000,
        ruin_threshold_pct: float = 30.0,
        random_seed: int | None = 42,
    ) -> None:
        """Initialize the bootstrap simulator.

        Args:
            num_simulations: Number of equity paths to generate.
            ruin_threshold_pct: Drawdown percentage used to identify ruin.
            random_seed: Seed for NumPy's random number generator, or ``None``
                for nondeterministic sampling.
        """
        self.num_simulations = num_simulations
        self.ruin_threshold_pct = ruin_threshold_pct
        self.rng = np.random.default_rng(random_seed)

    def run(self, trades: list[TradeRecord], initial_capital: float) -> MonteCarloOutput:
        """Run bootstrap simulations over realized trade outcomes.

        Args:
            trades: Completed trades supplying net PnL and percentage returns.
            initial_capital: Equity value at the start of each simulated path.

        Returns:
            Aggregate drawdown, ruin, tail-risk, and confidence-band results.
        """
        n_trades = len(trades)
        if n_trades < 3:
            return self._empty_output(initial_capital, n_trades)

        # 1. Extract realized dollar PnLs from trades
        pnls = np.array([float(t.pnl) for t in trades], dtype=np.float64)

        # 2. Bootstrap Resampling: Matrix shape (num_simulations, n_trades)
        sampled_indices = self.rng.integers(0, n_trades, size=(self.num_simulations, n_trades))
        sampled_pnls = pnls[sampled_indices]

        # 3. Compute Simulated Equity Paths (shape: num_simulations, n_trades + 1)
        cum_pnls = np.cumsum(sampled_pnls, axis=1)
        equity_paths = np.hstack(
            [
                np.full((self.num_simulations, 1), initial_capital, dtype=np.float64),
                initial_capital + cum_pnls,
            ]
        )

        # Prevent negative equity calculation artifacts
        equity_paths = np.maximum(equity_paths, 0.0)

        # 4. Compute Drawdown Distribution per Path
        running_max = np.maximum.accumulate(equity_paths, axis=1)
        drawdowns = (running_max - equity_paths) / np.where(running_max > 0, running_max, 1.0)
        max_drawdowns_pct = np.max(drawdowns, axis=1) * 100.0

        # 5. Risk of Ruin: Probability that equity drops below (1 - threshold) * initial_capital
        ruin_barrier = initial_capital * (1.0 - (self.ruin_threshold_pct / 100.0))
        min_equities = np.min(equity_paths, axis=1)
        ruin_events = np.sum(min_equities <= ruin_barrier)
        risk_of_ruin_pct = (ruin_events / self.num_simulations) * 100.0

        # 6. VaR & CVaR of Trade Returns
        returns_pct = np.array([float(t.pnl_pct) for t in trades], dtype=np.float64)
        var_95_pct = float(np.percentile(returns_pct, 5))
        tail_95 = returns_pct[returns_pct <= var_95_pct]
        cvar_95_pct = float(np.mean(tail_95)) if len(tail_95) > 0 else var_95_pct

        var_99_pct = float(np.percentile(returns_pct, 1))
        tail_99 = returns_pct[returns_pct <= var_99_pct]
        cvar_99_pct = float(np.mean(tail_99)) if len(tail_99) > 0 else var_99_pct

        # 7. Confidence Bands per Trade Step (Percentiles: 5th, 25th, 50th, 75th, 95th)
        p5 = np.percentile(equity_paths, 5, axis=0)
        p25 = np.percentile(equity_paths, 25, axis=0)
        p50 = np.percentile(equity_paths, 50, axis=0)
        p75 = np.percentile(equity_paths, 75, axis=0)
        p95 = np.percentile(equity_paths, 95, axis=0)

        confidence_bands = [
            {
                "trade_step": step,
                "p5": round(float(p5[step]), 2),
                "p25": round(float(p25[step]), 2),
                "p50": round(float(p50[step]), 2),
                "p75": round(float(p75[step]), 2),
                "p95": round(float(p95[step]), 2),
            }
            for step in range(n_trades + 1)
        ]

        return MonteCarloOutput(
            num_simulations=self.num_simulations,
            trade_count=n_trades,
            median_max_dd_pct=round(float(np.percentile(max_drawdowns_pct, 50)), 2),
            p90_max_dd_pct=round(float(np.percentile(max_drawdowns_pct, 90)), 2),
            p95_max_dd_pct=round(float(np.percentile(max_drawdowns_pct, 95)), 2),
            p99_max_dd_pct=round(float(np.percentile(max_drawdowns_pct, 99)), 2),
            risk_of_ruin_pct=round(float(risk_of_ruin_pct), 2),
            ruin_threshold_pct=self.ruin_threshold_pct,
            var_95_pct=round(float(var_95_pct), 2),
            cvar_95_pct=round(float(cvar_95_pct), 2),
            var_99_pct=round(float(var_99_pct), 2),
            cvar_99_pct=round(float(cvar_99_pct), 2),
            confidence_bands=confidence_bands,
        )

    def _empty_output(self, initial_capital: float, trade_count: int) -> MonteCarloOutput:
        return MonteCarloOutput(
            num_simulations=self.num_simulations,
            trade_count=trade_count,
            median_max_dd_pct=0.0,
            p90_max_dd_pct=0.0,
            p95_max_dd_pct=0.0,
            p99_max_dd_pct=0.0,
            risk_of_ruin_pct=0.0,
            ruin_threshold_pct=self.ruin_threshold_pct,
            var_95_pct=0.0,
            cvar_95_pct=0.0,
            var_99_pct=0.0,
            cvar_99_pct=0.0,
            confidence_bands=[
                {
                    "trade_step": 0,
                    "p5": initial_capital,
                    "p25": initial_capital,
                    "p50": initial_capital,
                    "p75": initial_capital,
                    "p95": initial_capital,
                }
            ],
        )
