# scripts/plot_btc_strategy_comparison.py
from __future__ import annotations

from pathlib import Path
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from src.backtester.walk_forward import WalkForwardEngine
from src.data_engine.storage_manager import StorageManager
from src.data_engine.unified_loader import UnifiedDataLoader

# Registro de estrategias
import src.strategies.custom_rule_strategy  # noqa: F401
import src.strategies.mean_reversion  # noqa: F401
import src.strategies.ml_strategy  # noqa: F401
import src.strategies.trend_following  # noqa: F401
import src.strategies.volatility_breakout  # noqa: F401

# Configuración del benchmark
ASSET = "BTC-USD"
TIMEFRAME = "4h"
START_DATE = "2021-01-01"
END_DATE = "2025-12-31"
INITIAL_CAPITAL = 100_000.0

STRATEGIES = [
    {
        "id": "trend_following_ema",
        "name": "Seguimiento de Tendencia (Control)",
        "params": {"fast_ema": 20, "slow_ema": 50},
        "color": "#1f77b4",
        "linestyle": "--",
        "linewidth": 1.5,
    },
    {
        "id": "regime_volatility_breakout",
        "name": "Ruptura Volatilidad",
        "params": {
            "channel_period": 20,
            "adx_period": 14,
            "adx_threshold": 25.0,
            "volume_ma_period": 20,
            "volume_multiplier": 1.2,
        },
        "color": "#ff7f0e",
        "linestyle": "-",
        "linewidth": 2.0,
    },
    {
        "id": "statistical_mean_reversion",
        "name": "Reversión a la Media",
        "params": {
            "lookback_period": 20,
            "z_entry_threshold": -2.0,
            "z_exit_threshold": 0.0,
            "rsi_period": 2,
            "rsi_entry_threshold": 15.0,
            "adx_max_regime": 22.0,
        },
        "color": "#2ca02c",
        "linestyle": ":",
        "linewidth": 1.5,
    },
    {
        "id": "ml_inference",
        "name": "ML Triple-Barrier",
        "params": {
            "threshold_long": 0.60,
            "threshold_exit": 0.40,
        },
        "color": "#d62728",
        "linestyle": "-.",
        "linewidth": 1.6,
    },
]


def plot_btc_strategy_comparison() -> None:
    storage = StorageManager()
    loader = UnifiedDataLoader()
    output_dir = Path("reports") / "plots"
    output_dir.mkdir(parents=True, exist_ok=True)

    wf_engine = WalkForwardEngine(storage=storage, loader=loader)

    equity_curves: dict[str, pd.Series] = {}
    drawdown_curves: dict[str, pd.Series] = {}

    for strat_cfg in STRATEGIES:
        strat_id = strat_cfg["id"]
        strat_name = strat_cfg["name"]
        strat_params = strat_cfg["params"]

        print(f"Ejecutando Rolling Walk-Forward OOS: {strat_name} en {ASSET} ({TIMEFRAME})...")
        res = wf_engine.run_rolling_walk_forward(
            symbol=ASSET,
            start_date=START_DATE,
            end_date=END_DATE,
            strategy_id=strat_id,
            strategy_params=strat_params,
            timeframe=TIMEFRAME,
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

        if "oos_equity_curve" in res and isinstance(res["oos_equity_curve"], list):
            eq_df = pd.DataFrame(res["oos_equity_curve"])
            eq_df["timestamp"] = pd.to_datetime(eq_df["time"])
            eq_series = eq_df.set_index("timestamp")["value"]
        elif "equity_curve" in res and isinstance(res["equity_curve"], dict):
            eq_series = pd.Series(res["equity_curve"])
            eq_series.index = pd.to_datetime(eq_series.index)
        else:
            raise ValueError(f"No se pudo extraer la curva de patrimonio para {strat_name}.")

        eq_series = eq_series.sort_index()
        norm_equity = (eq_series / INITIAL_CAPITAL) * 100.0
        peak = norm_equity.cummax()
        drawdown = ((norm_equity - peak) / peak) * 100.0

        equity_curves[strat_name] = norm_equity
        drawdown_curves[strat_name] = drawdown

    plt.rcParams["font.sans-serif"] = "DejaVu Sans"
    plt.rcParams["axes.edgecolor"] = "#d0d0d0"
    plt.rcParams["axes.linewidth"] = 0.8

    fig, (ax1, ax2) = plt.subplots(
        nrows=2,
        ncols=1,
        figsize=(11, 7.2),
        sharex=True,
        gridspec_kw={"height_ratios": [2.6, 1.0], "hspace": 0.08},
    )

    # 1. Panel Superior: Curvas de Balance Acumulado (100% OOS)
    for strat_cfg in STRATEGIES:
        name = strat_cfg["name"]
        ax1.plot(
            equity_curves[name].index,
            equity_curves[name].values,
            label=name,
            color=strat_cfg["color"],
            linestyle=strat_cfg["linestyle"],
            linewidth=strat_cfg["linewidth"],
            alpha=0.95,
        )

    ax1.axhline(100.0, color="#777777", linestyle=":", linewidth=0.9, alpha=0.7)
    ax1.set_ylabel("Balance Normalizado (Base = 100)", fontsize=10.5)
    ax1.grid(True, linestyle="--", alpha=0.35)

    # Ajuste dinámico de límites del panel superior
    min_eq = min(c.min() for c in equity_curves.values())
    max_eq = max(c.max() for c in equity_curves.values())
    ax1.set_ylim(min_eq - 5.0, max_eq + 8.0)

    first_year = equity_curves[STRATEGIES[0]["name"]].index[0].year
    last_year = equity_curves[STRATEGIES[0]["name"]].index[-1].year

    fig.suptitle(
        f"Evolución del Balance y Perfil de Caídas en {ASSET} ({TIMEFRAME}, {first_year}–{last_year})",
        fontsize=12.5,
        fontweight="bold",
        y=0.98,
    )

    ax1.legend(
        loc="lower center",
        bbox_to_anchor=(0.5, 1.02),
        ncol=4,
        frameon=True,
        facecolor="#ffffff",
        edgecolor="#e0e0e0",
        fontsize=9,
        columnspacing=1.5,
    )

    # 2. Panel Inferior: Curvas de Drawdown
    for strat_cfg in STRATEGIES:
        name = strat_cfg["name"]
        ax2.plot(
            drawdown_curves[name].index,
            drawdown_curves[name].values,
            label=name,
            color=strat_cfg["color"],
            linestyle=strat_cfg["linestyle"],
            linewidth=strat_cfg["linewidth"] * 0.85,
            alpha=0.85,
        )

    ax2.axhline(0.0, color="#444444", linestyle="-", linewidth=0.7, alpha=0.5)
    ax2.set_ylabel("Drawdown (%)", fontsize=10.5)
    ax2.set_xlabel("Fecha", fontsize=10.5)
    ax2.grid(True, linestyle="--", alpha=0.35)

    min_dd = min(c.min() for c in drawdown_curves.values())
    ax2.set_ylim(min_dd - 2.0, 1.0)

    ax2.xaxis.set_major_locator(mdates.YearLocator())
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax2.xaxis.set_minor_locator(mdates.MonthLocator(interval=3))

    output_png = output_dir / "btc_usd_4h_equity_drawdown.png"
    plt.savefig(output_png, dpi=300, bbox_inches="tight")
    plt.close()

    print(f"\n[ÉXITO] Gráfica guardada en: {output_png.resolve()}")


if __name__ == "__main__":
    plot_btc_strategy_comparison()
