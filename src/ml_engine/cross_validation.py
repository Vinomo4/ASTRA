from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass


@dataclass(slots=True)
class PurgedTimeSeriesSplit:
    n_splits: int = 5
    embargo: int = 0

    def split(self, X: Iterable[object]) -> list[tuple[list[int], list[int]]]:
        index = list(range(len(list(X))))
        fold_size = max(1, len(index) // self.n_splits)
        splits: list[tuple[list[int], list[int]]] = []
        for fold in range(self.n_splits):
            test_start = fold * fold_size
            test_end = min(len(index), test_start + fold_size)
            test_indices = index[test_start:test_end]
            train_indices = (
                index[: max(0, test_start - self.embargo)] + index[test_end + self.embargo :]
            )
            splits.append((train_indices, test_indices))
        return splits
