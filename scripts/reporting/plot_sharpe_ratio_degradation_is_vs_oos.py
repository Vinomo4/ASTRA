"""Plot in-sample versus out-of-sample Sharpe ratio degradation."""

import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

# Configure the institutional visual style.
plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["DejaVu Sans", "Arial", "Helvetica"],
        "font.size": 10,
        "axes.titlesize": 11,
        "axes.titleweight": "bold",
        "axes.labelsize": 10,
        "axes.labelweight": "normal",
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "legend.fontsize": 8.5,
        "axes.edgecolor": "#cccccc",
        "axes.linewidth": 0.8,
        "grid.color": "#e0e0e0",
        "grid.linestyle": "--",
        "grid.linewidth": 0.7,
        "grid.alpha": 0.8,
    }
)

# Empirical benchmark data (IS versus OOS).
ml_data = [
    {"asset": "SPY (1d)", "is_s": 2.56, "oos_s": 0.14, "offset": (-10, 12), "align": "right"},
    {"asset": "SPY (4h)", "is_s": 2.76, "oos_s": -0.58, "offset": (-12, -15), "align": "right"},
    {"asset": "BTC-USD (1d)", "is_s": 3.09, "oos_s": -0.58, "offset": (12, -15), "align": "left"},
    {"asset": "BTC-USD (4h)", "is_s": 6.04, "oos_s": -0.28, "offset": (-12, 12), "align": "right"},
    {"asset": "ETH-USD (1d)", "is_s": 3.10, "oos_s": 0.34, "offset": (12, 10), "align": "left"},
    {"asset": "ETH-USD (4h)", "is_s": 7.20, "oos_s": 0.50, "offset": (-12, 12), "align": "right"},
]

rules_data = [
    # Control (Dual EMA)
    {"is_s": 0.44, "oos_s": 0.44, "strat": "control"},
    {"is_s": 0.31, "oos_s": 0.31, "strat": "control"},
    {"is_s": -0.65, "oos_s": -0.65, "strat": "control"},
    {"is_s": 0.77, "oos_s": 0.77, "strat": "control"},
    {"is_s": -0.32, "oos_s": -0.32, "strat": "control"},
    {"is_s": -0.10, "oos_s": -0.10, "strat": "control"},
    # Volatility Breakout.
    {"is_s": 0.16, "oos_s": 0.16, "strat": "breakout"},
    {"is_s": -0.40, "oos_s": -0.40, "strat": "breakout"},
    {"is_s": 0.80, "oos_s": 0.80, "strat": "breakout"},
    {"is_s": 0.93, "oos_s": 0.93, "strat": "breakout"},
    {"is_s": 0.56, "oos_s": 0.56, "strat": "breakout"},
    {"is_s": 0.71, "oos_s": 0.71, "strat": "breakout"},
    # Mean Reversion.
    {"is_s": 0.44, "oos_s": 0.44, "strat": "reversion"},
    {"is_s": 0.39, "oos_s": 0.39, "strat": "reversion"},
    {"is_s": -0.13, "oos_s": -0.13, "strat": "reversion"},
    {"is_s": -0.56, "oos_s": -0.56, "strat": "reversion"},
    {"is_s": 0.44, "oos_s": 0.44, "strat": "reversion"},
    {"is_s": -0.21, "oos_s": -0.21, "strat": "reversion"},
]

fig, ax = plt.subplots(figsize=(8.5, 5.5), dpi=300)
ax.set_facecolor("#ffffff")
fig.patch.set_facecolor("#ffffff")

# Theoretical parity line.
x_line = np.linspace(-1.0, 7.8, 200)
ax.plot(
    x_line,
    x_line,
    color="#7f7f7f",
    linestyle="--",
    linewidth=1.2,
    label="In-Sample = Out-of-Sample Parity ($y = x$)",
    zorder=2,
)

# Degradation shading.
ax.fill_between(
    x_line,
    -1.5,
    x_line,
    color="#d62728",
    alpha=0.06,
    label="Performance Degradation Zone ($WFER < 1.0$)",
    zorder=1,
)

# OOS = 0 reference line.
ax.axhline(0, color="#b0b0b0", linestyle=":", linewidth=1.0, zorder=2)

# Map styles for rule-based strategies.
colors = {"control": "#1f77b4", "breakout": "#ff7f0e", "reversion": "#2ca02c"}
markers = {"control": "s", "breakout": "D", "reversion": "o"}
names = {
    "control": "Trend Following (Control)",
    "breakout": "Volatility Breakout",
    "reversion": "Mean Reversion",
}

for st in ["control", "breakout", "reversion"]:
    sub = [r for r in rules_data if r["strat"] == st]
    ax.scatter(
        [r["is_s"] for r in sub],
        [r["oos_s"] for r in sub],
        color=colors[st],
        edgecolors="#333333",
        linewidths=0.7,
        s=50,
        marker=markers[st],
        alpha=0.85,
        label=names[st],
        zorder=4,
    )

# Machine learning models.
ax.scatter(
    [m["is_s"] for m in ml_data],
    [m["oos_s"] for m in ml_data],
    color="#d62728",
    edgecolors="#550000",
    linewidths=1.0,
    s=85,
    marker="^",
    label="ML Triple-Barrier (Supervised)",
    zorder=5,
)

# Annotate ML models with arrowed labels.
for m in ml_data:
    ax.annotate(
        m["asset"],
        (m["is_s"], m["oos_s"]),
        textcoords="offset points",
        xytext=m["offset"],
        ha=m["align"],
        fontsize=8.5,
        fontweight="bold",
        color="#8b0000",
        bbox=dict(
            boxstyle="round,pad=0.2",
            facecolor="#ffffff",
            edgecolor="#d62728",
            alpha=0.9,
            linewidth=0.6,
        ),
        arrowprops=dict(arrowstyle="->", color="#d62728", lw=0.7),
        zorder=6,
    )

# Configure limits and labels.
ax.set_xlim(-1.0, 7.8)
ax.set_ylim(-1.0, 1.8)
ax.set_xlabel("In-Sample Sharpe Ratio (Training / Calibration)")
ax.set_ylabel("Out-of-Sample Sharpe Ratio (Continuous Evaluation)")
ax.set_title("Performance Degradation: In-Sample versus Out-of-Sample Sharpe Ratio", pad=12)

# Place the legend in the clear upper-left quadrant.
ax.legend(loc="upper left", frameon=True, facecolor="#ffffff", edgecolor="#e0e0e0", framealpha=0.95)

ax.grid(True)
plt.tight_layout()

# Create the output directory and save the chart.
output_dir = os.path.join("reports", "plots")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "sharpe_ratio_degradation_is_vs_oos.png")

plt.savefig(output_path, dpi=300, bbox_inches="tight")
plt.close(fig)
