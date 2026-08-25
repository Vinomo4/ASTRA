# scripts/run_academic_benchmark.py
from __future__ import annotations

import json
from pathlib import Path
from typing import Any
import pandas as pd

from src.analytics.metrics import PerformanceAnalytics
from src.analytics.monte_carlo import MonteCarloSimulator
from src.api.routers.simulation import get_market_data
from src.backtester.event_engine import BacktestEngine
from src.backtester.walk_forward import WalkForwardEngine
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader

# Ensure all strategy modules are imported so @StrategyRegistry.register executes
import src.strategies.trend_following  # noqa: F401
import src.strategies.volatility_breakout  # noqa: F401
import src.strategies.mean_reversion  # noqa: F401
import src.strategies.custom_rule_strategy  # noqa: F401
import src.strategies.ml_strategy  # noqa: F401
from src.strategies.registry import StrategyRegistry

# Academic Benchmark Settings
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
        "params": {
            "model_path": "models/BTC_USD_model.joblib",
            "threshold_long": 0.60,
            "threshold_exit": 0.40,
        },
    },
]


def run_benchmark_suite() -> None:
    storage = StorageManager()
    loader = YFinanceLoader()
    wf_engine = WalkForwardEngine(storage=storage)
    mc_simulator = MonteCarloSimulator(num_simulations=1000, ruin_threshold_pct=30.0)

    output_dir = Path("reports")
    output_dir.mkdir(parents=True, exist_ok=True)

    summary_records: list[dict[str, Any]] = []

    print("\n" + "=" * 90)
    print("STARTING ACADEMIC STRATEGY BENCHMARK SUITE (TFM)")
    print("=" * 90)

    for asset in BENCHMARK_ASSETS:
        for tf in BENCHMARK_TIMEFRAMES:
            print(f"\n>>> Asset: {asset} | Timeframe: {tf} ({START_DATE} -> {END_DATE})")

            # 1. Fetch Market Data
            try:
                df = get_market_data(
                    symbol=asset,
                    start_date=START_DATE,
                    end_date=END_DATE,
                    timeframe=tf,
                    storage=storage,
                    loader=loader,
                )
            except Exception as exc:
                print(f"  [ERROR] Data load failed for {asset} [{tf}]: {exc}")
                continue

            if df.empty or len(df) < 50:
                print(f"  [SKIP] Insufficient bars ({len(df)}) for {asset} [{tf}]")
                continue

            for strat_cfg in STRATEGIES_TO_TEST:
                strat_id = strat_cfg["id"]
                strat_name = strat_cfg["name"]
                strat_params = strat_cfg["params"]

                # Check model artifact availability for ML strategy
                if strat_id == "ml_inference":
                    model_path = strat_params.get("model_path", "")
                    if not Path(model_path).exists():
                        print(f"  [SKIP] {strat_name} (Artifact not found: {model_path})")
                        continue

                print(f"  -> Testing: {strat_name}...", end=" ", flush=True)

                try:
                    # 2. Instantiate and run primary backtest
                    strat = StrategyRegistry.create(strat_id, **strat_params)
                    engine = BacktestEngine(
                        strategy=strat,
                        initial_capital=INITIAL_CAPITAL,
                        risk_fraction=0.01,
                        atr_multiplier_sl=2.0,
                        atr_multiplier_tp=4.0,
                        commission_bps=5.0,
                        slippage_bps=2.0,
                        gap_slippage_enabled=True,
                    )
                    res = engine.run(df)
                    stats = PerformanceAnalytics.calculate_trade_statistics(engine.trades)

                    # 3. Walk-Forward Train/Test Split
                    try:
                        wf_res = wf_engine.run_split_validation(
                            symbol=asset,
                            start_date=START_DATE,
                            end_date=END_DATE,
                            strategy_id=strat_id,
                            strategy_params=strat_params,
                            timeframe=tf,
                            train_ratio=0.70,
                            initial_capital=INITIAL_CAPITAL,
                        )
                        wfer = wf_res["wfer"]
                        sharpe_is = wf_res["in_sample"]["sharpe_ratio"]
                        sharpe_oos = wf_res["out_of_sample"]["sharpe_ratio"]
                        robustness = wf_res["robustness_status"]
                    except Exception:
                        wfer, sharpe_is, sharpe_oos, robustness = 0.0, 0.0, 0.0, "N/A"

                    # 4. Monte Carlo Stress Test
                    mc_output = mc_simulator.run(engine.trades, initial_capital=INITIAL_CAPITAL)

                    summary_records.append(
                        {
                            "Asset": asset,
                            "Timeframe": tf,
                            "Strategy": strat_name,
                            "Total Return %": round(float(res["total_return_pct"]), 2),
                            "CAGR %": round(float(res["cagr"]), 2),
                            "Sharpe": round(float(res["sharpe_ratio"]), 2),
                            "Sortino": round(float(res["sortino_ratio"]), 2),
                            "Max DD %": round(float(res["max_drawdown_pct"]), 2),
                            "Profit Factor": round(float(stats.get("profit_factor", 0.0)), 2),
                            "Win Rate %": round(float(stats.get("win_rate_pct", 0.0)), 2),
                            "Trades": int(res["total_trades"]),
                            "WFER": wfer,
                            "Sharpe (IS)": sharpe_is,
                            "Sharpe (OOS)": sharpe_oos,
                            "Validation": robustness,
                            "Ruin Risk %": mc_output.risk_of_ruin_pct,
                            "CVaR 95%": mc_output.cvar_95_pct,
                        }
                    )
                    print("DONE")
                except Exception as exc:
                    print(f"FAILED ({exc})")

    if not summary_records:
        print("\n[WARNING] No benchmark records generated.")
        return

    # 5. Export Formatted Artifacts
    df_results = pd.DataFrame(summary_records)

    json_path = output_dir / "academic_benchmark_results.json"
    with open(json_path, "w") as f:
        json.dump(summary_records, f, indent=2)

    md_path = output_dir / "academic_benchmark_summary.md"
    with open(md_path, "w") as f:
        f.write("# Academic Strategy Benchmark Results\n\n")
        f.write(df_results.to_markdown(index=False))

    tex_path = output_dir / "academic_benchmark_summary.tex"
    with open(tex_path, "w") as f:
        f.write(df_results.to_latex(index=False))

    print("\n" + "=" * 90)
    print("BENCHMARK SUITE COMPLETE")
    print(f"Artifacts saved to:\n  - {json_path}\n  - {md_path}\n  - {tex_path}")
    print("=" * 90 + "\n")


if __name__ == "__main__":
    run_benchmark_suite()
