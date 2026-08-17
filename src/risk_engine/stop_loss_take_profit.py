from __future__ import annotations


def trailing_stop(entry_price: float, current_price: float, trail_percent: float) -> float:
    anchor = max(entry_price, current_price)
    return anchor * (1 - trail_percent)
