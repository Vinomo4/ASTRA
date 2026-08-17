from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class OptimizationResult:
    best_params: dict[str, float]
    best_score: float


def optimize_hyperparameters(search_space: dict[str, tuple[float, float]]) -> OptimizationResult:
    return OptimizationResult(
        best_params={key: low for key, (low, _) in search_space.items()}, best_score=0.0
    )
