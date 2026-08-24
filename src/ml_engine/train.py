# src/ml_engine/train.py
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score

from src.ml_engine.cross_validation import PurgedKFold
from src.ml_engine.labeling import (
    add_vertical_barriers,
    cusum_filter,
    get_daily_volatility,
    triple_barrier_labeling,
)
from src.ml_engine.optimizer import HyperparameterOptimizer


@dataclass
class TrainingConfig:
    """Configuration for ML model training and feature generation."""

    symbol: str
    target_metric: str = "neg_log_loss"
    pt_sl: list[float] = field(default_factory=lambda: [1.5, 1.0])
    holding_period: int = 10
    volatility_span: int = 20
    n_splits: int = 4
    pct_embargo: float = 0.01
    optimize_hyperparameters: bool = False
    n_trials: int = 20
    random_seed: int = 42
    model_dir: str = "models"


@dataclass
class TrainingResult:
    """Encapsulates trained model, feature metadata, and validation performance."""

    model: BaseEstimator
    feature_names: list[str]
    metrics: dict[str, float]
    labels_distribution: dict[int, int]
    best_params: dict[str, Any]
    model_path: str | None = None


class FeatureEngineeringPipeline:
    """Constructs stationary financial features from raw OHLCV market bars."""

    @staticmethod
    def build_features(df: pd.DataFrame) -> pd.DataFrame:
        features = pd.DataFrame(index=df.index)

        close = df["close"]
        high = df["high"]
        low = df["low"]
        volume = df["volume"]

        # 1. Log returns & momentum
        features["ret_1"] = np.log(close / close.shift(1))
        features["ret_5"] = np.log(close / close.shift(5))
        features["ret_15"] = np.log(close / close.shift(15))

        # 2. Moving Average Convergence Divergence (MACD ratio)
        ema_fast = close.ewm(span=12, adjust=False).mean()
        ema_slow = close.ewm(span=26, adjust=False).mean()
        features["macd_ratio"] = (ema_fast - ema_slow) / close

        # 3. Relative Strength Index (RSI - 14)
        delta = close.diff()
        gain = delta.clip(lower=0.0)
        loss = -delta.clip(upper=0.0)
        avg_gain = gain.rolling(window=14, min_periods=14).mean()
        avg_loss = loss.rolling(window=14, min_periods=14).mean()
        rs = avg_gain / (avg_loss + 1e-9)
        features["rsi_14"] = 100.0 - (100.0 / (1.0 + rs))

        # 4. Normalized True Range / Volatility
        prev_close = close.shift(1)
        tr = np.maximum(
            high - low,
            np.maximum(np.abs(high - prev_close), np.abs(low - prev_close)),
        )
        features["natr_14"] = (tr.rolling(14).mean() / close) * 100.0

        # 5. Bollinger Bands %B and Bandwidth
        sma_20 = close.rolling(20).mean()
        rstd_20 = close.rolling(20).std()
        upper_bb = sma_20 + (2.0 * rstd_20)
        lower_bb = sma_20 - (2.0 * rstd_20)
        features["bb_pct_b"] = (close - lower_bb) / (upper_bb - lower_bb + 1e-9)
        features["bb_bandwidth"] = (upper_bb - lower_bb) / (sma_20 + 1e-9)

        # 6. Volume intensity ratio
        vol_ma = volume.rolling(20).mean()
        features["volume_ratio"] = volume / (vol_ma + 1e-9)

        return features.dropna()


class ModelTrainer:
    """Orchestrates end-to-end dataset creation, model optimization, and training."""

    def __init__(self, config: TrainingConfig) -> None:
        self.config = config

    def prepare_dataset(self, df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
        """
        Extracts features and applies CUSUM volatility filtering + Triple-Barrier labeling.
        """
        features = FeatureEngineeringPipeline.build_features(df)
        close = df["close"].loc[features.index]

        daily_vol = get_daily_volatility(close, span=self.config.volatility_span)
        events = cusum_filter(close, threshold=daily_vol)

        # Align events to feature set index
        valid_events = events.intersection(features.index)
        if len(valid_events) == 0:
            raise ValueError("CUSUM filter generated 0 valid events on feature-aligned data.")

        vertical_barriers = add_vertical_barriers(
            valid_events, close, num_bars=self.config.holding_period
        )

        labels_df = triple_barrier_labeling(
            close=close,
            events=valid_events,
            pt_sl=self.config.pt_sl,
            target=daily_vol,
            vertical_barrier=vertical_barriers,
        )

        common_idx = features.index.intersection(labels_df.index)
        X = features.loc[common_idx]
        y = labels_df.loc[common_idx, "bin"]
        t1 = labels_df.loc[common_idx, "t1"]

        # Map directional labels (-1, 0, 1) to binary classification: 1 (Profitable Long) vs 0 (Other)
        y_binary = (y == 1).astype(int)

        return X, y_binary, t1

    def train(self, df: pd.DataFrame) -> TrainingResult:
        """Trains and validates model, saving serialized pipeline artifacts."""
        X, y, t1 = self.prepare_dataset(df)

        best_params: dict[str, Any] = {
            "max_iter": 100,
            "learning_rate": 0.05,
            "max_leaf_nodes": 31,
            "min_samples_leaf": 20,
            "random_state": self.config.random_seed,
        }

        if self.config.optimize_hyperparameters:
            optimizer = HyperparameterOptimizer(
                n_trials=self.config.n_trials,
                n_splits=self.config.n_splits,
                pct_embargo=self.config.pct_embargo,
                metric=self.config.target_metric,
                random_seed=self.config.random_seed,
            )
            opt_res = optimizer.optimize(X, y, t1, model_type="hist_gb")
            best_params.update(opt_res.best_params)

        # Cross-validation score estimation
        cv = PurgedKFold(
            n_splits=self.config.n_splits,
            t1=t1,
            pct_embargo=self.config.pct_embargo,
        )

        oof_preds = np.zeros(len(y))
        oof_probs = np.zeros(len(y))

        for train_idx, val_idx in cv.split(X):
            if len(train_idx) == 0 or len(val_idx) == 0:
                continue

            model = HistGradientBoostingClassifier(**best_params)
            model.fit(X.iloc[train_idx], y.iloc[train_idx])

            probs = model.predict_proba(X.iloc[val_idx])[:, 1]
            oof_probs[val_idx] = probs
            oof_preds[val_idx] = (probs >= 0.5).astype(int)

        # Train final estimator on full dataset
        final_model = HistGradientBoostingClassifier(**best_params)
        final_model.fit(X, y)

        # Evaluate Out-Of-Fold metrics
        metrics = {
            "accuracy": float(accuracy_score(y, oof_preds)),
            "log_loss": float(log_loss(y, oof_probs)),
            "brier_score": float(brier_score_loss(y, oof_probs)),
            "roc_auc": (float(roc_auc_score(y, oof_probs)) if len(np.unique(y)) > 1 else 0.5),
        }

        # Persist model artifact
        os.makedirs(self.config.model_dir, exist_ok=True)
        model_filename = f"{self.config.symbol.replace('/', '_').replace('-', '_')}_model.joblib"
        model_path = str(Path(self.config.model_dir) / model_filename)

        artifact = {
            "model": final_model,
            "feature_names": list(X.columns),
            "config": self.config,
            "metrics": metrics,
        }
        joblib.dump(artifact, model_path)

        return TrainingResult(
            model=final_model,
            feature_names=list(X.columns),
            metrics=metrics,
            labels_distribution=dict(y.value_counts()),
            best_params=best_params,
            model_path=model_path,
        )
