# scripts/train_ml_models.py
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
    storage = StorageManager()
    loader = YFinanceLoader()
    output_models_dir = Path("models")
    output_models_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 80)
    print("ENTRENAMIENTO DE MODELOS ML POR ACTIVO Y TEMPORALIDAD (ASTRA)")
    print("=" * 80)

    for asset in BENCHMARK_ASSETS:
        clean_asset = asset.replace("-", "_").replace("/", "_")
        for tf in BENCHMARK_TIMEFRAMES:
            model_id = f"{clean_asset}_{tf}"
            print(f"\n>>> Procesando: {asset} [{tf}] -> Identificador: {model_id}...")

            # 1. Carga de datos de mercado
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
                print(f"  [ERROR] Fallo al descargar datos para {asset} [{tf}]: {exc}")
                continue

            if df.empty or len(df) < 100:
                print(f"  [SKIP] Muestra insuficiente ({len(df)} barras) para {asset} [{tf}]")
                continue

            # 2. Normalización de fechas a UTC neutro (tz-naive)
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

            # 3. Configuración del entrenamiento
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

            # 4. Entrenamiento y serialización
            try:
                trainer = ModelTrainer(config=config)
                result = trainer.train(df_ml)
                print(f"  [ÉXITO] Modelo guardado en: {result.model_path}")
                print(f"          Métricas OOF: {result.metrics}")
                print(f"          Distribución de clases: {result.labels_distribution}")
            except Exception as exc:
                print(f"  [ERROR] Fallo al entrenar {model_id}: {exc}")

    print("\n" + "=" * 80)
    print("ENTRENAMIENTO COMPLETADO. ARTEFACTOS DISPONIBLES EN: models/")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    train_ml_models()
