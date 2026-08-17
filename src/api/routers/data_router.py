from __future__ import annotations

from fastapi import APIRouter, Depends

from src.api.dependencies import AppServices, get_services
from src.api.schemas.market import MarketDataQuery

router = APIRouter()


@router.post("/fetch")
async def fetch_data(
    query: MarketDataQuery, services: AppServices = Depends(get_services)
) -> dict[str, str]:
    _ = services
    return {"status": "queued", "symbol": query.symbol}
