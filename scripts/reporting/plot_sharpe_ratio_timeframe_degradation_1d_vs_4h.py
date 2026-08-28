"""plot_sharpe_ratio_timeframe_degradation_1d_vs_4h.py.

Generates Figure 5.2: Paired bar chart illustrating Sharpe ratio contraction
and relative variation caused by the timeframe shift from 1d to 4h across all
evaluated strategies and asset classes.
"""

from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# ---------------------------------------------------------
# Output Directory Setup
# ---------------------------------------------------------
OUTPUT_DIR = Path("reports/plots")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------
# Plot Styling Configuration (Matching Thesis Clean Theme)
# ---------------------------------------------------------
plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": [
            "DejaVu Sans",
            "Arial",
            "Helvetica",
            "Liberation Sans",
        ],
        "font.size": 9.5,
        "axes.labelsize": 10.5,
        "axes.titlesize": 11.5,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "legend.fontsize": 9.5,
        "figure.dpi": 300,
        "axes.edgecolor": "#cccccc",
        "axes.linewidth": 0.8,
    }
)

# ---------------------------------------------------------
# Empirical Benchmark Data (Chapter 5 / Table 5.3)
# ---------------------------------------------------------
data = [
    # SPY - Traditional Equities
    {
        "Activo": "SPY",
        "Estrategia": "Reversión a\nla Media",
        "1d": 1.42,
        "4h": 1.35,
    },
    {
        "Activo": "SPY",
        "Estrategia": "Ruptura de\nVolatilidad",
        "1d": 0.38,
        "4h": -0.42,
    },
    {
        "Activo": "SPY",
        "Estrategia": "Inferencia ML\n(Triple Barrera)",
        "1d": 0.61,
        "4h": -0.78,
    },
    # BTC-USD - Cryptoassets
    {
        "Activo": "BTC-USD",
        "Estrategia": "Reversión a\nla Media",
        "1d": 0.12,
        "4h": -0.65,
    },
    {
        "Activo": "BTC-USD",
        "Estrategia": "Ruptura de\nVolatilidad",
        "1d": 1.18,
        "4h": 0.94,
    },
    {
        "Activo": "BTC-USD",
        "Estrategia": "Inferencia ML\n(Triple Barrera)",
        "1d": 0.85,
        "4h": -0.31,
    },
    # ETH-USD - Cryptoassets
    {
        "Activo": "ETH-USD",
        "Estrategia": "Reversión a\nla Media",
        "1d": 0.42,
        "4h": -0.52,
    },
    {
        "Activo": "ETH-USD",
        "Estrategia": "Ruptura de\nVolatilidad",
        "1d": 1.05,
        "4h": 0.82,
    },
    {
        "Activo": "ETH-USD",
        "Estrategia": "Inferencia ML\n(Triple Barrera)",
        "1d": 0.91,
        "4h": 0.35,
    },
]

df = pd.DataFrame(data)

# ---------------------------------------------------------
# Figure Construction
# ---------------------------------------------------------
fig, ax = plt.subplots(figsize=(10.5, 5.2), dpi=300)

x = np.arange(len(df))
bar_width = 0.35

# Paired bars
rects_1d = ax.bar(
    x - bar_width / 2,
    df["1d"],
    bar_width,
    label="Escala Diaria (1d)",
    color="#1f77b4",
    edgecolor="#333333",
    linewidth=0.6,
    zorder=3,
)

rects_4h = ax.bar(
    x + bar_width / 2,
    df["4h"],
    bar_width,
    label="Escala Intradiaria (4h)",
    color="#d95f02",
    edgecolor="#333333",
    linewidth=0.6,
    zorder=3,
)

# Reference lines & grid styling
ax.axhline(0, color="#888888", linewidth=0.8, linestyle="--", zorder=2)
ax.grid(True, linestyle="--", color="#e8e8e8", alpha=0.9, zorder=0)

# Vertical separators between assets
ax.axvline(2.5, color="#dcdcdc", linewidth=1.0, linestyle="--", zorder=1)
ax.axvline(5.5, color="#dcdcdc", linewidth=1.0, linestyle="--", zorder=1)

# Group headers (Asset names)
ax.text(
    1.0,
    1.62,
    "Renta Variable (SPY)",
    ha="center",
    va="center",
    fontsize=10,
    fontweight="bold",
    color="#222222",
)
ax.text(
    4.0,
    1.62,
    "Criptoactivo (BTC-USD)",
    ha="center",
    va="center",
    fontsize=10,
    fontweight="bold",
    color="#222222",
)
ax.text(
    7.0,
    1.62,
    "Criptoactivo (ETH-USD)",
    ha="center",
    va="center",
    fontsize=10,
    fontweight="bold",
    color="#222222",
)

# Axis format and limits
ax.set_ylabel("Ratio de Sharpe Anualizado", labelpad=8)
ax.set_xticks(x)
ax.set_xticklabels(df["Estrategia"], rotation=0, ha="center")
ax.set_ylim(-1.15, 1.85)

# Value annotations over/under bars
for rect in list(rects_1d) + list(rects_4h):
    h = rect.get_height()
    va_pos = "bottom" if h >= 0 else "top"
    y_offset = 2 if h >= 0 else -3
    ax.annotate(
        f"{h:.2f}",
        xy=(rect.get_x() + rect.get_width() / 2, h),
        xytext=(0, y_offset),
        textcoords="offset points",
        ha="center",
        va=va_pos,
        fontsize=8,
        color="#222222",
    )

# Title & Legend layout
fig.suptitle(
    "Sensibilidad Temporal del Ratio de Sharpe: Escala Diaria (1d) frente a Intradiaria (4h)",
    fontsize=11.5,
    fontweight="bold",
    y=0.98,
)

ax.legend(
    loc="upper center",
    bbox_to_anchor=(0.5, 1.09),
    ncol=2,
    frameon=True,
    facecolor="white",
    edgecolor="#e0e0e0",
    fontsize=9.2,
    handlelength=1.5,
    handletextpad=0.5,
    columnspacing=2.0,
)

plt.tight_layout(rect=[0, 0, 1, 0.94])

# ---------------------------------------------------------
# Export to PNG
# ---------------------------------------------------------
png_path = OUTPUT_DIR / "sharpe_ratio_timeframe_degradation_1d_vs_4h.png"
plt.savefig(png_path, dpi=300, bbox_inches="tight")
plt.close(fig)

print(f"Generated successfully: {png_path}")
