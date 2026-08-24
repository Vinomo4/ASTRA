# tests/unit/test_cross_validation.py
from datetime import UTC

import numpy as np
import pandas as pd
import pytest

from src.ml_engine.cross_validation import PurgedKFold


class TestPurgedKFold:
    @pytest.fixture
    def sample_data(self):
        n = 100
        dates = pd.date_range("2024-01-01", periods=n, freq="D", tz=UTC)
        X = pd.DataFrame({"feat1": np.random.randn(n)}, index=dates)
        # Each label resolves 5 days after start
        t1 = pd.Series([dates[min(i + 5, n - 1)] for i in range(n)], index=dates)
        return X, t1

    def test_purged_kfold_split_count(self, sample_data):
        X, t1 = sample_data
        cv = PurgedKFold(n_splits=5, t1=t1, pct_embargo=0.02)
        splits = list(cv.split(X))
        assert len(splits) == 5

    def test_purging_prevents_information_leakage(self, sample_data):
        X, t1 = sample_data
        cv = PurgedKFold(n_splits=4, t1=t1, pct_embargo=0.05)

        for train_idx, test_idx in cv.split(X):
            # No test index can be in train index
            assert len(np.intersect1d(train_idx, test_idx)) == 0

            test_start_dt = t1.index[test_idx.min()]
            train_dts = t1.index[train_idx]
            train_t1 = t1.iloc[train_idx]

            # Prior train samples must not overlap past test start
            prior_train_mask = train_dts < test_start_dt
            if prior_train_mask.any():
                assert (train_t1[prior_train_mask] <= test_start_dt).all()

    def test_fallback_without_t1(self, sample_data):
        X, _ = sample_data
        cv = PurgedKFold(n_splits=3, t1=None, pct_embargo=0.0)
        splits = list(cv.split(X))
        assert len(splits) == 3
        for train_idx, test_idx in splits:
            assert len(np.intersect1d(train_idx, test_idx)) == 0
            assert len(train_idx) + len(test_idx) == len(X)
