from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class TrainResult:
    model_name: str
    score: float


def train_model(model_name: str, features: object, labels: object) -> TrainResult:
    return TrainResult(model_name=model_name, score=0.0)
