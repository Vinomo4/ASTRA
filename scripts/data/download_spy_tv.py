# scripts/data/download_spy_tv.py
from pathlib import Path
import warnings
import pandas as pd

# 1. Suppress non-fatal Python 3.12 regex warnings from tvDatafeed
warnings.filterwarnings("ignore", category=SyntaxWarning, module="tvDatafeed")

from tvDatafeed import Interval, TvDatafeed

# 2. Initialize TvDatafeed (Optionally add free TradingView credentials to bypass the 2500-bar cap)
# tv = TvDatafeed(username="your_username", password="your_password")
tv = TvDatafeed()

print("Downloading SPY 4h bars from TradingView (AMEX)...")
df = tv.get_hist(
    symbol="SPY",
    exchange="AMEX",
    interval=Interval.in_4_hour,
    n_bars=3500,
)

if df is not None and not df.empty:
    df = df.reset_index()
    df.rename(columns={"datetime": "timestamp"}, inplace=True)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    # 3. Filter target window
    df = df[(df["timestamp"] >= "2021-01-01") & (df["timestamp"] <= "2025-12-31")]
    df["symbol"] = "SPY"

    # 4. Standardize schema
    df = df[["timestamp", "symbol", "open", "high", "low", "close", "volume"]]
    df = df.sort_values("timestamp").reset_index(drop=True)

    output_dir = Path("data/historical")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "SPY_4h.csv"

    df.to_csv(output_path, index=False)
    print(f"\nSuccessfully saved {len(df)} bars to {output_path}")
    print(f"Date range: {df['timestamp'].min()} -> {df['timestamp'].max()}")
else:
    print("Failed to retrieve data from TradingView.")
