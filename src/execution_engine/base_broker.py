"""Define the common broker execution interface."""

from __future__ import annotations

from abc import ABC, abstractmethod

from src.core.events import FillEvent, OrderEvent


class BaseBroker(ABC):
    """Define the interface for executing market orders."""

    @abstractmethod
    def execute_order(self, order: OrderEvent, current_price: float) -> FillEvent:
        """Execute an order at the current market price.

        Args:
            order: Order request to execute.
            current_price: Current market price for the order's symbol.

        Returns:
            The resulting fill event.

        Raises:
            NotImplementedError: Always; subclasses must implement execution.
        """
        raise NotImplementedError
