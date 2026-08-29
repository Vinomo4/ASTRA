"""Define machine-learning training and model discovery schemas."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class MLTrainRequest(BaseModel):
    """Payload to trigger model training and cross-validation pipeline."""

    symbol: str = Field(default="BTC-USD", description="Ticker symbol to train on.")
    start_date: datetime = Field(
        default=datetime(2023, 1, 1, tzinfo=UTC),
        description="Start timestamp for training dataset slice.",
    )
    end_date: datetime = Field(
        default=datetime(2023, 12, 31, tzinfo=UTC),
        description="End timestamp for training dataset slice.",
    )
    target_metric: str = Field(
        default="neg_log_loss", description="Optimization objective ('neg_log_loss' or 'roc_auc')."
    )
    pt_multiplier: float = Field(
        default=1.5, ge=0.1, le=10.0, description="Take-Profit barrier multiplier."
    )
    sl_multiplier: float = Field(
        default=1.0, ge=0.1, le=10.0, description="Stop-Loss barrier multiplier."
    )
    holding_period: int = Field(
        default=10, ge=1, le=100, description="Vertical barrier holding period in bars."
    )
    volatility_span: int = Field(
        default=20, ge=5, le=100, description="EWM span for dynamic volatility."
    )
    n_splits: int = Field(
        default=4, ge=2, le=10, description="Number of Purged K-Fold validation splits."
    )
    pct_embargo: float = Field(
        default=0.01, ge=0.0, le=0.10, description="Embargo percentage post-validation."
    )
    optimize_hyperparameters: bool = Field(
        default=False, description="Enable Optuna Bayesian hyperparameter search."
    )
    n_trials: int = Field(default=15, ge=1, le=100, description="Optuna trial iterations.")
    random_seed: int = Field(default=42, description="RNG seed for reproducibility.")


class MLTrainResponse(BaseModel):
    """Response payload containing cross-validated performance metrics and artifact info."""

    symbol: str
    status: str
    model_path: str
    metrics: dict[str, float]
    labels_distribution: dict[int, int]
    best_params: dict[str, Any]
    feature_names: list[str]


class MLModelInfo(BaseModel):
    """Metadata summary of a persisted model artifact."""

    filename: str
    model_path: str
    symbol: str
    size_kb: float
    feature_names: list[str]
    metrics: dict[str, float]


class MLModelListResponse(BaseModel):
    """List of all available trained models on disk."""

    models: list[MLModelInfo]
