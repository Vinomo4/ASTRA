from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class MarketDataQuery(BaseModel):
    symbol: str
    start_date: datetime
    end_date: datetime
