"""Train benchmark ML models for every configured asset and timeframe."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.api.routers.simulation import get_market_data
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader
from src.ml_engine.train import ModelTrainer, TrainingConfig

BENCHMARK_ASSETS = ["SPY", "BTC-USD", "ETH-USD"]
BENCHMARK_TIMEFRAMES = ["1d", "4h"]
START_DATE = "2021-01-01"
END_DATE = "2025-12-31"


def train_ml_models() -> None:
    """Train and serialize the configured benchmark ML models."""
    storage = StorageManager()
    loader = YFinanceLoader()
    output_models_dir = Path("models")
    output_models_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 80)
    print("ML MODEL TRAINING BY ASSET AND TIMEFRAME (ASTRA)")
    print("=" * 80)

    for asset in BENCHMARK_ASSETS:
        clean_asset = asset.replace("-", "_").replace("/", "_")
        for tf in BENCHMARK_TIMEFRAMES:
            model_id = f"{clean_asset}_{tf}"
            print(f"\n>>> Processing: {asset} [{tf}] -> Identifier: {model_id}...")

            # 1. Load market data.
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
                print(f"  [ERROR] Failed to download data for {asset} [{tf}]: {exc}")
                continue

            if df.empty or len(df) < 100:
                print(f"  [SKIP] Insufficient sample ({len(df)} bars) for {asset} [{tf}]")
                continue

            # 2. Normalize dates to timezone-naive UTC.
            df_ml = df.copy()
            if "timestamp" in df_ml.columns:
                df_ml["timestamp"] = pd.to_datetime(df_ml["timestamp"], utc=True).dt.tz_localize(
                    None
                )
                df_ml.set_index("timestamp", inplace=True)
            elif isinstance(df_ml.index, pd.DatetimeIndex):
                if df_ml.index.tz is not None:
                    df_ml.index = df_ml.index.tz_convert("UTC").tz_localize(None)

            df_ml.sort_index(inplace=True)

            # 3. Configure training.
            config = TrainingConfig(
                symbol=model_id,
                target_metric="neg_log_loss",
                pt_sl=[1.5, 1.0],
                holding_period=10,
                volatility_span=20,
                n_splits=4,
                pct_embargo=0.01,
                optimize_hyperparameters=False,
                model_dir=str(output_models_dir),
            )

            # 4. Train and serialize the model.
            try:
                trainer = ModelTrainer(config=config)
                result = trainer.train(df_ml)
                print(f"  [SUCCESS] Model saved at: {result.model_path}")
                print(f"            OOF metrics: {result.metrics}")
                print(f"            Class distribution: {result.labels_distribution}")
            except Exception as exc:
                print(f"  [ERROR] Failed to train {model_id}: {exc}")

    print("\n" + "=" * 80)
    print("TRAINING COMPLETED. ARTIFACTS AVAILABLE AT: models/")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    train_ml_models()
