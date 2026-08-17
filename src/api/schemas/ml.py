from __future__ import annotations

from pydantic import BaseModel, Field


class TrainRequest(BaseModel):
    strategy_name: str
    target_label: str = "triple_barrier"
    n_trials: int = Field(default=20, ge=1)


class TrainingMetrics(BaseModel):
    model_name: str
    score: float
