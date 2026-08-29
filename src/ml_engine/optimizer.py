"""Hyperparameter optimization for financial classifiers."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import optuna
import pandas as pd
from sklearn.base import BaseEstimator, clone
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import log_loss, roc_auc_score

from src.ml_engine.cross_validation import PurgedKFold

# Suppress verbose Optuna logging during search runs
optuna.logging.set_verbosity(optuna.logging.WARNING)


@dataclass
class OptimizationResult:
    """Stores the outcome and performance metrics of a hyperparameter tuning run."""

    best_params: dict[str, Any]
    best_score: float
    study: optuna.Study
    n_trials: int
    metric_name: str
    metadata: dict[str, Any] = field(default_factory=dict)


class HyperparameterOptimizer:
    """Tune financial classifiers with Optuna and purged cross-validation.

    Purged K-fold validation and a post-test embargo reduce temporal leakage
    while Optuna searches the estimator's hyperparameter space.
    """

    def __init__(
        self,
        n_trials: int = 30,
        n_splits: int = 4,
        pct_embargo: float = 0.01,
        metric: str = "neg_log_loss",
        random_seed: int = 42,
    ) -> None:
        """Initialize the optimizer.

        Args:
            n_trials: Maximum number of Optuna trials.
            n_splits: Number of purged cross-validation folds.
            pct_embargo: Fraction of observations embargoed after test folds.
            metric: Objective metric name.
            random_seed: Seed used by samplers and estimators.
        """
        self.n_trials = n_trials
        self.n_splits = n_splits
        self.pct_embargo = pct_embargo
        self.metric = metric
        self.random_seed = random_seed

    def _default_param_sampler(self, trial: optuna.Trial, model_type: str) -> dict[str, Any]:
        """Samples hyperparameter distributions based on estimator type."""
        if model_type == "hist_gb":
            return {
                "max_iter": trial.suggest_int("max_iter", 50, 200, step=25),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
                "max_leaf_nodes": trial.suggest_int("max_leaf_nodes", 15, 63),
                "min_samples_leaf": trial.suggest_int("min_samples_leaf", 10, 50),
                "l2_regularization": trial.suggest_float("l2_regularization", 1e-4, 10.0, log=True),
                "random_state": self.random_seed,
            }
        elif model_type == "random_forest":
            return {
                "n_estimators": trial.suggest_int("n_estimators", 50, 200, step=25),
                "max_depth": trial.suggest_int("max_depth", 3, 10),
                "min_samples_leaf": trial.suggest_int("min_samples_leaf", 5, 40),
                "max_features": trial.suggest_float("max_features", 0.3, 1.0),
                "random_state": self.random_seed,
            }
        raise ValueError(f"Unsupported model_type: '{model_type}'. Provide a custom param_sampler.")

    def optimize(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        t1: pd.Series,
        model_type: str = "hist_gb",
        param_sampler: Callable[[optuna.Trial], dict[str, Any]] | None = None,
    ) -> OptimizationResult:
        """Run a Bayesian hyperparameter search over purged folds.

        Args:
            X: Feature matrix.
            y: Target labels aligned with ``X``.
            t1: Event end times aligned with ``X``.
            model_type: Built-in estimator search space to use.
            param_sampler: Optional custom function that samples trial parameters.

        Returns:
            Best parameters, score, study, and optimization metadata.

        Raises:
            ValueError: If ``model_type`` is unsupported and no custom sampler
                provides parameters for the fallback estimator.
        """
        cv = PurgedKFold(n_splits=self.n_splits, t1=t1, pct_embargo=self.pct_embargo)
        direction = "maximize" if self.metric in {"roc_auc", "accuracy"} else "minimize"

        def objective(trial: optuna.Trial) -> float:
            params = (
                param_sampler(trial)
                if param_sampler is not None
                else self._default_param_sampler(trial, model_type)
            )

            # Initialize base estimator
            estimator: BaseEstimator
            if model_type == "hist_gb":
                estimator = HistGradientBoostingClassifier(**params)
            elif model_type == "random_forest":
                estimator = RandomForestClassifier(**params)
            else:
                estimator = HistGradientBoostingClassifier(**params)

            fold_scores: list[float] = []

            for train_idx, val_idx in cv.split(X):
                if len(train_idx) == 0 or len(val_idx) == 0:
                    continue

                X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
                X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

                # Check minimum required class representation in train and val
                if len(np.unique(y_train)) < 2 or len(np.unique(y_val)) < 2:
                    continue

                model = clone(estimator)
                model.fit(X_train, y_train)
                y_probs = model.predict_proba(X_val)

                if self.metric == "roc_auc":
                    if y_probs.shape[1] == 2:
                        score = roc_auc_score(y_val, y_probs[:, 1])
                    else:
                        score = roc_auc_score(y_val, y_probs, multi_class="ovr")
                elif self.metric == "neg_log_loss":
                    score = log_loss(y_val, y_probs)
                else:
                    score = log_loss(y_val, y_probs)

                fold_scores.append(score)

            if not fold_scores:
                return float("inf") if direction == "minimize" else float("-inf")

            return float(np.mean(fold_scores))

        sampler = optuna.samplers.TPESampler(seed=self.random_seed)
        study = optuna.create_study(direction=direction, sampler=sampler)
        study.optimize(objective, n_trials=self.n_trials)

        return OptimizationResult(
            best_params=study.best_params,
            best_score=study.best_value,
            study=study,
            n_trials=len(study.trials),
            metric_name=self.metric,
            metadata={"model_type": model_type, "n_splits": self.n_splits},
        )
