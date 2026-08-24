# tests/unit/test_optimizer.py
from datetime import UTC

import numpy as np
import pandas as pd
import pytest

from src.ml_engine.optimizer import HyperparameterOptimizer


class TestHyperparameterOptimizer:
    @pytest.fixture
    def synthetic_dataset(self):
        np.random.seed(42)
        n = 150
        dates = pd.date_range("2024-01-01", periods=n, freq="D", tz=UTC)

        X = pd.DataFrame(
            {
                "feat_a": np.random.randn(n),
                "feat_b": np.random.randn(n),
                "feat_c": np.random.randn(n),
            },
            index=dates,
        )
        y = pd.Series(np.random.choice([0, 1], size=n, p=[0.6, 0.4]), index=dates)
        t1 = pd.Series([dates[min(i + 5, n - 1)] for i in range(n)], index=dates)
        return X, y, t1

    def test_optimizer_execution_and_scoring(self, synthetic_dataset):
        X, y, t1 = synthetic_dataset
        optimizer = HyperparameterOptimizer(
            n_trials=5,
            n_splits=3,
            pct_embargo=0.01,
            metric="neg_log_loss",
            random_seed=42,
        )

        res = optimizer.optimize(X, y, t1, model_type="hist_gb")

        assert res.n_trials == 5
        assert isinstance(res.best_score, float)
        assert "learning_rate" in res.best_params
        assert "max_leaf_nodes" in res.best_params
