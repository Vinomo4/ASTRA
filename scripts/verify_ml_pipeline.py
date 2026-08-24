# scripts/verify_ml_pipeline.py
from datetime import UTC

import numpy as np
import pandas as pd

from src.core.constants import SignalType
from src.core.events import MarketDataEvent
from src.data_engine.storage_manager import StorageManager
from src.ml_engine.train import ModelTrainer, TrainingConfig
from src.strategies.ml_strategy import MLInferenceStrategy

# 1. Generate synthetic price data with explicit schema columns
dates = pd.date_range("2023-01-01", "2023-06-01", freq="1h", tz=UTC)
np.random.seed(42)

steps = np.random.normal(0.0002, 0.01, size=len(dates))
price = 20000.0 * np.exp(np.cumsum(steps))

df = pd.DataFrame(
    {
        "timestamp": dates,
        "symbol": "BTC-USD",
        "open": price * 0.999,
        "high": price * 1.005,
        "low": price * 0.995,
        "close": price,
        "volume": np.random.uniform(50, 500, len(dates)),
    },
    index=dates,
)

# 2. Persist to DuckDB Storage
print("[1/3] Saving market bars to StorageManager...")
storage = StorageManager()
storage.save_ohlcv(df)

# 3. Train ML Model via CUSUM + Triple-Barrier + Purged K-Fold
print("[2/3] Training ML Model...")
trainer = ModelTrainer(
    TrainingConfig(
        symbol="BTC-USD",
        holding_period=10,
        volatility_span=20,
        n_splits=3,
        model_dir="models",
    )
)
result = trainer.train(df)

print(f"      Model artifact: {result.model_path}")
print(f"      OOF Metrics:    {result.metrics}")
print(f"      Label Counts:   {result.labels_distribution}")

# 4. Stream bars into MLInferenceStrategy to verify event-driven execution
print("[3/3] Feeding live bar stream into MLInferenceStrategy...")
strategy = MLInferenceStrategy(
    model_path=result.model_path,
    threshold_long=0.52,
    threshold_exit=0.48,
    lookback_window=40,
)

generated_signals = []
for idx, row in df.iterrows():
    event = MarketDataEvent(
        timestamp=idx,
        symbol="BTC-USD",
        open=float(row["open"]),
        high=float(row["high"]),
        low=float(row["low"]),
        close=float(row["close"]),
        volume=float(row["volume"]),
    )
    sig = strategy.on_bar(event)
    if sig is not None:
        generated_signals.append(sig)

long_signals = [s for s in generated_signals if s.signal_type == SignalType.LONG]
exit_signals = [s for s in generated_signals if s.signal_type == SignalType.EXIT]

print(f"      Total Signals: {len(generated_signals)}")
print(f"      LONG Entries:  {len(long_signals)}")
print(f"      EXITS:         {len(exit_signals)}")

if generated_signals:
    print(f"      Sample Signal: {generated_signals[0]}")
