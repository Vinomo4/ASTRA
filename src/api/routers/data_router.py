"""Expose market data ingestion endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.dependencies import AppServices, get_services
from src.api.schemas.market import MarketDataQuery

router = APIRouter()


@router.post("/fetch")
async def fetch_data(
    query: MarketDataQuery, services: Annotated[AppServices, Depends(get_services)]
) -> dict[str, str]:
    """Queue a market data fetch request.

    Args:
        query: Market data request parameters.
        services: Shared application services.

    Returns:
        Queue status and requested market symbol.
    """
    _ = services
    return {"status": "queued", "symbol": query.symbol}
