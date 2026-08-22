# src/strategies/base_strategy.py
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field

from src.core.events import MarketDataEvent, SignalEvent


class ParameterDefinition(BaseModel):
    name: str
    label: str
    param_type: str  # "int" | "float" | "bool" | "str" | "select"
    default: Any
    min_value: float | None = None
    max_value: float | None = None
    step: float | None = None
    options: list[str] | None = None
    description: str = ""


class StrategyMetadata(BaseModel):
    id: str
    name: str
    description: str
    category: str = "Rule-Based"  # "Rule-Based" | "ML-Enhanced" | "Statistical"
    parameters: list[ParameterDefinition] = Field(default_factory=list)


class BaseStrategy(ABC):
    """Abstract Base Class for all event-driven quantitative strategies."""

    id: str = "base_strategy"
    name: str = "Base Strategy"
    description: str = "Abstract base strategy"
    category: str = "Rule-Based"

    def __init__(self, **params: Any) -> None:
        self.params: dict[str, Any] = self._merge_with_defaults(params)

    @classmethod
    @abstractmethod
    def get_metadata(cls) -> StrategyMetadata:
        """Returns the parameter schema and descriptions for UI form rendering."""
        raise NotImplementedError

    @abstractmethod
    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        """
        Receives a point-in-time MarketDataEvent and returns a SignalEvent
        (SignalType.LONG or SignalType.EXIT) or None if no action is triggered.
        """
        raise NotImplementedError

    def _merge_with_defaults(self, custom_params: dict[str, Any]) -> dict[str, Any]:
        """Merges user-provided parameters with strategy default definitions."""
        metadata = self.get_metadata()
        defaults = {p.name: p.default for p in metadata.parameters}
        defaults.update(custom_params)
        return defaults

    def get_param(self, key: str, default: Any = None) -> Any:
        return self.params.get(key, default)
