"""Download and display a sample of historical Binance market data."""

from src.data_engine.binance_loader import BinanceLoader

loader = BinanceLoader()

print("Downloading BTC-USD 4h history (2021-2025)...")
df = loader.fetch_ohlcv(symbol="BTC-USD", start="2021-01-01", end="2025-12-31", timeframe="4h")

print("\n--- Data Summary ---")
print(f"Total bars: {len(df)}")
if not df.empty:
    print(f"Start date: {df['timestamp'].min()}")
    print(f"End date: {df['timestamp'].max()}")
    print(f"Columns: {list(df.columns)}")
    print("\nFirst rows:")
    print(df.head(3).to_string())
