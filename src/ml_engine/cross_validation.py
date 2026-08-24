# src/ml_engine/cross_validation.py
from __future__ import annotations

from collections.abc import Iterator

import numpy as np
import pandas as pd


class PurgedKFold:
    """
    Purged and Embargoed K-Fold Cross Validation.

    Prevents lookahead leakage by:
    1. Purging training observations whose evaluation window [t_0, t_1] overlaps with the test set.
    2. Embargoing training observations immediately following the test set by an embargo percentage.
    """

    def __init__(
        self,
        n_splits: int = 5,
        t1: pd.Series | None = None,
        pct_embargo: float = 0.01,
    ) -> None:
        if n_splits < 2:
            raise ValueError(f"n_splits must be at least 2, got {n_splits}")
        self.n_splits = n_splits
        self.t1 = t1
        self.pct_embargo = max(0.0, pct_embargo)

    def split(
        self,
        X: pd.DataFrame | np.ndarray,
        y: pd.Series | np.ndarray | None = None,
        groups: np.ndarray | None = None,
    ) -> Iterator[tuple[np.ndarray, np.ndarray]]:
        """
        Generates purged and embargoed train/test integer index splits.
        """
        _ = (y, groups)
        num_samples = len(X)
        indices = np.arange(num_samples)
        embargo_size = int(num_samples * self.pct_embargo)

        # Generate standard continuous chunk boundaries for test splits
        chunk_bounds = np.linspace(0, num_samples, self.n_splits + 1, dtype=int)

        for i in range(self.n_splits):
            test_start, test_end = chunk_bounds[i], chunk_bounds[i + 1]
            test_indices = indices[test_start:test_end]

            if self.t1 is None:
                # Fallback to standard continuous embargoed split if no label horizons exist
                train_indices = np.setdiff1d(indices, test_indices)
                if embargo_size > 0 and test_end < num_samples:
                    embargo_range = np.arange(test_end, min(test_end + embargo_size, num_samples))
                    train_indices = np.setdiff1d(train_indices, embargo_range)
                yield train_indices, test_indices
                continue

            # Event-level purging using t1 series
            test_t1 = self.t1.iloc[test_indices]
            test_start_dt = test_t1.index.min()
            test_end_dt = test_t1.max()

            # 1. Purge: remove training items whose horizon spans into or across test range
            train_t1 = self.t1.drop(self.t1.index[test_indices])
            train_start_dts = train_t1.index

            # Training events starting before test, but ending after test starts
            purge_left = train_start_dts[
                (train_start_dts < test_start_dt) & (train_t1 > test_start_dt)
            ]

            # 2. Embargo: remove training items immediately after test horizon
            if embargo_size > 0 and test_end < num_samples:
                embargo_cutoff = self.t1.index[min(test_end + embargo_size, num_samples - 1)]
                embargo_mask = (train_start_dts >= test_end_dt) & (
                    train_start_dts <= embargo_cutoff
                )
                embargo_items = train_start_dts[embargo_mask]
            else:
                embargo_items = pd.Index([])

            to_drop = purge_left.union(embargo_items)
            valid_train_dts = train_start_dts.difference(to_drop)

            # Map valid datetime indexes back to integer locations
            dt_to_loc = {dt: idx for idx, dt in enumerate(self.t1.index)}
            train_locs = np.array(
                [dt_to_loc[dt] for dt in valid_train_dts if dt in dt_to_loc], dtype=int
            )

            yield train_locs, test_indices
