from __future__ import annotations

from fastapi import APIRouter

from src.api.schemas.ml import TrainingMetrics, TrainRequest
from src.ml_engine.train import train_model

router = APIRouter()


@router.post("/train", response_model=TrainingMetrics)
async def train_endpoint(request: TrainRequest) -> TrainingMetrics:
    result = train_model(request.strategy_name, features=None, labels=None)
    return TrainingMetrics(model_name=result.model_name, score=result.score)
