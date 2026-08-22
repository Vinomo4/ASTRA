# tests/analytics/test_monte_carlo.py
from datetime import UTC, datetime

from src.analytics.monte_carlo import MonteCarloSimulator
from src.core.constants import OrderSide
from src.core.models import TradeRecord


def make_trade(pnl: float, pnl_pct: float) -> TradeRecord:
    """Helper to instantiate mock TradeRecord objects matching core models."""
    now = datetime.now(UTC)
    side = next(iter(OrderSide))  # Adapts dynamically to BUY/SELL or LONG/SHORT enums

    return TradeRecord(
        symbol="BTC-USD",
        side=side,
        entry_time=now,
        exit_time=now,
        entry_price=100.0,
        exit_price=100.0 + pnl,
        quantity=1.0,
        gross_pnl=pnl,
        pnl=pnl,
        pnl_pct=pnl_pct,
        exit_reason="TP",
    )


class TestMonteCarloSimulator:
    def test_insufficient_trades_fallback(self):
        """Simulator must return safe empty output when trades < 3."""
        simulator = MonteCarloSimulator(num_simulations=100, random_seed=42)
        trades = [make_trade(100.0, 1.0), make_trade(-50.0, -0.5)]

        res = simulator.run(trades=trades, initial_capital=10_000.0)

        assert res.trade_count == 2
        assert res.risk_of_ruin_pct == 0.0
        assert res.median_max_dd_pct == 0.0
        assert len(res.confidence_bands) == 1
        assert res.confidence_bands[0]["p50"] == 10_000.0

    def test_all_winning_trades_invariants(self):
        """Under strictly positive returns: Max DD = 0%, Risk of Ruin = 0%."""
        simulator = MonteCarloSimulator(
            num_simulations=500, ruin_threshold_pct=30.0, random_seed=42
        )
        trades = [make_trade(200.0, 2.0) for _ in range(10)]

        res = simulator.run(trades=trades, initial_capital=10_000.0)

        assert res.risk_of_ruin_pct == 0.0
        assert res.median_max_dd_pct == 0.0
        assert res.p99_max_dd_pct == 0.0
        # Every step in every path must be strictly >= initial capital
        for band in res.confidence_bands:
            assert band["p5"] >= 10_000.0
            assert band["p95"] >= band["p50"] >= band["p5"]

    def test_all_losing_catastrophic_trades(self):
        """Severe losses exceeding ruin threshold must yield 100% Risk of Ruin."""
        simulator = MonteCarloSimulator(
            num_simulations=500, ruin_threshold_pct=30.0, random_seed=42
        )
        # 10 consecutive losses of $500 on $10,000 capital (-$5,000 = -50% DD > 30% ruin threshold)
        trades = [make_trade(-500.0, -5.0) for _ in range(10)]

        res = simulator.run(trades=trades, initial_capital=10_000.0)

        assert res.risk_of_ruin_pct == 100.0
        assert res.median_max_dd_pct == 50.0
        assert res.p99_max_dd_pct == 50.0

    def test_mathematical_percentile_hierarchy(self):
        """Verify strict monotonicity across confidence bands and drawdown percentiles."""
        simulator = MonteCarloSimulator(num_simulations=1_000, random_seed=42)
        trades = [
            make_trade(300.0, 3.0),
            make_trade(-200.0, -2.0),
            make_trade(400.0, 4.0),
            make_trade(-150.0, -1.5),
            make_trade(-350.0, -3.5),
            make_trade(500.0, 5.0),
        ]

        res = simulator.run(trades=trades, initial_capital=10_000.0)

        # 1. Drawdown percentile ordering: P90 <= P95 <= P99
        assert res.median_max_dd_pct <= res.p90_max_dd_pct
        assert res.p90_max_dd_pct <= res.p95_max_dd_pct
        assert res.p95_max_dd_pct <= res.p99_max_dd_pct

        # 2. Tail risk hierarchy: CVaR (Expected Shortfall) must be <= VaR
        assert res.cvar_95_pct <= res.var_95_pct
        assert res.cvar_99_pct <= res.var_99_pct

        # 3. Confidence band ordering across all trade steps: p5 <= p25 <= p50 <= p75 <= p95
        assert len(res.confidence_bands) == len(trades) + 1
        for step in res.confidence_bands:
            assert step["p5"] <= step["p25"] <= step["p50"] <= step["p75"] <= step["p95"]

    def test_seed_reproducibility(self):
        """Identical seeds must generate identical statistical results."""
        trades = [
            make_trade(100.0, 1.0),
            make_trade(-50.0, -0.5),
            make_trade(200.0, 2.0),
            make_trade(-80.0, -0.8),
        ]

        sim1 = MonteCarloSimulator(num_simulations=500, random_seed=123).run(trades, 10_000.0)
        sim2 = MonteCarloSimulator(num_simulations=500, random_seed=123).run(trades, 10_000.0)

        assert sim1.median_max_dd_pct == sim2.median_max_dd_pct
        assert sim1.p95_max_dd_pct == sim2.p95_max_dd_pct
        assert sim1.risk_of_ruin_pct == sim2.risk_of_ruin_pct
        assert sim1.confidence_bands == sim2.confidence_bands
