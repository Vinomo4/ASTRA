# src/api/routers/__init__.py
from fastapi import APIRouter

from src.api.routers.comparison import router as comparison_router
from src.api.routers.ml_router import router as ml_router
from src.api.routers.simulation import router as simulation_router
from src.api.routers.strategies import router as strategies_router
from src.api.routers.validation import router as validation_router

router = APIRouter(prefix="/api/backtest", tags=["Backtest"])

router.include_router(strategies_router)
router.include_router(simulation_router)
router.include_router(validation_router)
router.include_router(comparison_router)
router.include_router(ml_router, prefix="/ml", tags=["Machine Learning"])

__all__ = ["router"]
