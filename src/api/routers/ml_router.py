# src/api/routers/ml_router.py
from __future__ import annotations

from pathlib import Path

import joblib
from fastapi import APIRouter, HTTPException

from src.api.schemas.ml_schemas import (
    MLModelInfo,
    MLModelListResponse,
    MLTrainRequest,
    MLTrainResponse,
)
from src.data_engine.storage_manager import StorageManager
from src.ml_engine.train import ModelTrainer, TrainingConfig

router = APIRouter()
MODELS_DIR = "models"


@router.post("/train", response_model=MLTrainResponse)
async def train_ml_model(req: MLTrainRequest) -> MLTrainResponse:
    """
    Executes CUSUM filtering, Triple-Barrier labeling, Purged K-Fold
    cross-validation, and persists the trained estimator artifact.
    """
    try:
        storage = StorageManager()
        df = storage.load_bars(
            symbol=req.symbol,
            start_date=req.start_date,
            end_date=req.end_date,
        )

        if df.empty or len(df) < 50:
            raise ValueError(
                f"Insufficient historical data for {req.symbol} between {req.start_date} and {req.end_date}."
            )

        config = TrainingConfig(
            symbol=req.symbol,
            target_metric=req.target_metric,
            pt_sl=[req.pt_multiplier, req.sl_multiplier],
            holding_period=req.holding_period,
            volatility_span=req.volatility_span,
            n_splits=req.n_splits,
            pct_embargo=req.pct_embargo,
            optimize_hyperparameters=req.optimize_hyperparameters,
            n_trials=req.n_trials,
            random_seed=req.random_seed,
            model_dir=MODELS_DIR,
        )

        trainer = ModelTrainer(config)
        result = trainer.train(df)

        return MLTrainResponse(
            symbol=req.symbol,
            status="completed",
            model_path=result.model_path or "",
            metrics=result.metrics,
            labels_distribution=result.labels_distribution,
            best_params=result.best_params,
            feature_names=result.feature_names,
        )
    except (ValueError, KeyError, RuntimeError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/models", response_model=MLModelListResponse)
async def list_trained_models() -> MLModelListResponse:
    """Returns metadata for all persisted model artifacts found in the models directory."""
    models: list[MLModelInfo] = []
    models_path = Path(MODELS_DIR)

    if not models_path.exists():
        return MLModelListResponse(models=[])

    for file_path in models_path.glob("*.joblib"):
        try:
            artifact = joblib.load(file_path)
            stat = file_path.stat()

            metrics = artifact.get("metrics", {}) if isinstance(artifact, dict) else {}
            feature_names = artifact.get("feature_names", []) if isinstance(artifact, dict) else []
            config = artifact.get("config") if isinstance(artifact, dict) else None
            symbol = getattr(config, "symbol", file_path.stem.replace("_model", ""))

            models.append(
                MLModelInfo(
                    filename=file_path.name,
                    model_path=str(file_path),
                    symbol=symbol,
                    size_kb=round(stat.st_size / 1024.0, 2),
                    feature_names=feature_names,
                    metrics=metrics,
                )
            )
        except (ValueError, KeyError, RuntimeError, OSError):
            continue

    return MLModelListResponse(models=models)
