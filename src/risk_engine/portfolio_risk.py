from __future__ import annotations


class PortfolioRiskManager:
    def __init__(self, max_gross_exposure: float = 1.0) -> None:
        self.max_gross_exposure = max_gross_exposure

    def is_within_limits(self, gross_exposure: float) -> bool:
        return gross_exposure <= self.max_gross_exposure
