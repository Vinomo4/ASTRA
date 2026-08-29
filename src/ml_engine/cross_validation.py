"""Cross-validation utilities for time-dependent financial observations."""

from __future__ import annotations

from collections.abc import Iterator

import numpy as np
import pandas as pd


class PurgedKFold:
    """Generate purged and embargoed K-fold splits.

    The splitter limits lookahead leakage by removing training observations
    whose evaluation windows overlap the test set and embargoing observations
    immediately after each test fold.
    """

    def __init__(
        self, n_splits: int = 5, t1: pd.Series | None = None, pct_embargo: float = 0.01
    ) -> None:
        """Initialize the cross-validation splitter.

        Args:
            n_splits: Number of folds. Must be at least two.
            t1: Event end times indexed by event start time. If omitted, only
                the post-test embargo is applied.
            pct_embargo: Non-negative fraction of observations to embargo
                after each test fold.

        Raises:
            ValueError: If ``n_splits`` is less than two.
        """
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
        """Generate purged and embargoed train/test index splits.

        Args:
            X: Feature observations to split.
            y: Optional targets accepted for estimator API compatibility.
            groups: Optional groups accepted for estimator API compatibility.

        Yields:
            Pairs of training and test integer-index arrays.
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
