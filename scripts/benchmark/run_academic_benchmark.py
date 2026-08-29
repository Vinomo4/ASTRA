"""Run the academic walk-forward benchmark and write summary artifacts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

# Register the benchmark strategies.
import src.strategies.custom_rule_strategy  # noqa: F401
import src.strategies.mean_reversion  # noqa: F401
import src.strategies.ml_strategy  # noqa: F401
import src.strategies.trend_following  # noqa: F401
import src.strategies.volatility_breakout  # noqa: F401
from src.analytics.monte_carlo import MonteCarloSimulator
from src.backtester.walk_forward import WalkForwardEngine
from src.data_engine.storage_manager import StorageManager

BENCHMARK_ASSETS = ["SPY", "BTC-USD", "ETH-USD"]
BENCHMARK_TIMEFRAMES = ["1d", "4h"]
START_DATE = "2021-01-01"
END_DATE = "2025-12-31"
INITIAL_CAPITAL = 100_000.0

STRATEGIES_TO_TEST = [
    {
        "id": "trend_following_ema",
        "name": "Control Baseline (Dual EMA)",
        "params": {"fast_ema": 20, "slow_ema": 50},
    },
    {
        "id": "regime_volatility_breakout",
        "name": "Adaptive Volatility Breakout",
        "params": {
            "channel_period": 20,
            "adx_period": 14,
            "adx_threshold": 25.0,
            "volume_ma_period": 20,
            "volume_multiplier": 1.2,
        },
    },
    {
        "id": "statistical_mean_reversion",
        "name": "Statistical Z-Score Mean Reversion",
        "params": {
            "lookback_period": 20,
            "z_entry_threshold": -2.0,
            "z_exit_threshold": 0.0,
            "rsi_period": 2,
            "rsi_entry_threshold": 15.0,
            "adx_max_regime": 22.0,
        },
    },
    {
        "id": "ml_inference",
        "name": "ML Triple-Barrier Inference",
        "params": {"threshold_long": 0.60, "threshold_exit": 0.40, "lookback_window": 50},
    },
]


def run_benchmark_suite() -> None:
    """Run every benchmark case and write JSON, Markdown, and LaTeX summaries."""
    storage = StorageManager()
    wf_engine = WalkForwardEngine(storage=storage)
    mc_simulator = MonteCarloSimulator(num_simulations=1000, ruin_threshold_pct=30.0)

    output_dir = Path("reports")
    output_dir.mkdir(parents=True, exist_ok=True)

    summary_records: list[dict[str, Any]] = []

    print("\n" + "=" * 95)
    print("RUNNING ACADEMIC WALK-FORWARD BENCHMARK SUITE (100% OOS + COSTS)")
    print("=" * 95)

    for asset in BENCHMARK_ASSETS:
        for tf in BENCHMARK_TIMEFRAMES:
            print(f"\n>>> Asset: {asset} | Timeframe: {tf} (Evaluation: 2022 -> 2025)")

            for strat_cfg in STRATEGIES_TO_TEST:
                strat_id = strat_cfg["id"]
                strat_name = strat_cfg["name"]
                strat_params = strat_cfg["params"].copy()

                print(f"  -> Evaluating [OOS]: {strat_name:36} ...", end=" ", flush=True)

                try:
                    # 1. Rolling walk-forward simulation.
                    wf_res = wf_engine.run_rolling_walk_forward(
                        symbol=asset,
                        start_date=START_DATE,
                        end_date=END_DATE,
                        strategy_id=strat_id,
                        strategy_params=strat_params,
                        timeframe=tf,
                        initial_capital=INITIAL_CAPITAL,
                        train_duration_months=12,
                        test_step_months=1,
                        risk_fraction=0.01,
                        atr_multiplier_sl=2.0,
                        atr_multiplier_tp=4.0,
                        commission_bps=5.0,
                        commission_fixed=0.0,
                        slippage_bps=2.0,
                        gap_slippage_enabled=True,
                    )

                    # 2. Monte Carlo stress analysis.
                    trades = wf_res.get("trades", [])
                    mc_output = mc_simulator.run(trades, initial_capital=INITIAL_CAPITAL)

                    # 3. Consolidate performance and friction metrics.
                    summary_records.append(
                        {
                            "Asset": asset,
                            "Timeframe": tf,
                            "Strategy": strat_name,
                            "Gross Return %": wf_res.get(
                                "gross_return_pct", wf_res["total_return_pct"]
                            ),
                            "Total Friction %": wf_res.get("total_friction_pct", 0.0),
                            "Cost Drag %": wf_res.get("cost_drag_pct", 0.0),
                            "Total Return %": wf_res["total_return_pct"],
                            "CAGR %": wf_res["cagr"],
                            "Sharpe": wf_res["sharpe_ratio"],
                            "Sortino": wf_res["sortino_ratio"],
                            "Max DD %": wf_res["max_drawdown_pct"],
                            "Profit Factor": wf_res["profit_factor"],
                            "Win Rate %": wf_res["win_rate_pct"],
                            "Trades": wf_res["total_trades"],
                            "WFER": wf_res["wfer"],
                            "Sharpe (IS)": wf_res["sharpe_is"],
                            "Sharpe (OOS)": wf_res["sharpe_oos"],
                            "Validation": wf_res["validation_status"],
                            "Ruin Risk %": mc_output.risk_of_ruin_pct,
                            "CVaR 95%": mc_output.cvar_95_pct,
                        }
                    )
                    print("OK")
                except Exception as exc:
                    print(f"FAILED ({exc})")

    if not summary_records:
        print("\n[WARNING] The benchmark produced no records.")
        return

    # 4. Generate analytical artifacts.
    df_results = pd.DataFrame(summary_records)

    json_path = output_dir / "academic_benchmark_results.json"
    with open(json_path, "w") as f:
        json.dump(summary_records, f, indent=2)

    md_path = output_dir / "academic_benchmark_summary.md"
    with open(md_path, "w") as f:
        f.write("# Academic Strategy Benchmark Results (Rolling Walk-Forward 100% OOS)\n\n")
        f.write(df_results.to_markdown(index=False))

    tex_path = output_dir / "academic_benchmark_summary.tex"
    with open(tex_path, "w") as f:
        f.write(df_results.to_latex(index=False))

    print("\n" + "=" * 95)
    print("BENCHMARK SUITE COMPLETED")
    print(f"Artifacts generated successfully at:\n  - {json_path}\n  - {md_path}\n  - {tex_path}")
    print("=" * 95 + "\n")


if __name__ == "__main__":
    run_benchmark_suite()
