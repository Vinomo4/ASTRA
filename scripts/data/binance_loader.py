# scripts/test_binance_loader.py
from src.data_engine.binance_loader import BinanceLoader

loader = BinanceLoader()

print("Descargando histórico de BTC-USD en temporalidad 4h (2021-2025)...")
df = loader.fetch_ohlcv(symbol="BTC-USD", start="2021-01-01", end="2025-12-31", timeframe="4h")

print("\n--- Resumen de Datos ---")
print(f"Total de barras: {len(df)}")
if not df.empty:
    print(f"Fecha inicial: {df['timestamp'].min()}")
    print(f"Fecha final: {df['timestamp'].max()}")
    print(f"Columnas: {list(df.columns)}")
    print("\nMuestra de las primeras filas:")
    print(df.head(3).to_string())
