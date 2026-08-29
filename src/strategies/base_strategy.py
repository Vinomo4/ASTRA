"""Base interfaces and metadata models for event-driven strategies."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field

from src.core.events import MarketDataEvent, SignalEvent


class ParameterDefinition(BaseModel):
    """Describe a configurable strategy parameter for API and UI consumers."""

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
    """Describe a strategy and its configurable parameters."""

    id: str
    name: str
    description: str
    category: str = "Rule-Based"  # "Rule-Based" | "Machine Learning"
    parameters: list[ParameterDefinition] = Field(default_factory=list)


class BaseStrategy(ABC):
    """Define the interface for event-driven quantitative strategies."""

    id: str = "base_strategy"
    name: str = "Base Strategy"
    description: str = "Abstract base strategy"
    category: str = "Rule-Based"

    def __init__(self, **params: Any) -> None:
        """Initialize a strategy with defaults and caller overrides.

        Args:
            **params: Strategy-specific parameter overrides.
        """
        self.params: dict[str, Any] = self._merge_with_defaults(params)

    @classmethod
    @abstractmethod
    def get_metadata(cls) -> StrategyMetadata:
        """Return the strategy metadata and parameter schema.

        Returns:
            Metadata used for discovery, configuration, and UI rendering.
        """
        raise NotImplementedError

    @abstractmethod
    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        """Process one point-in-time market bar.

        Args:
            event: Completed market bar to evaluate.

        Returns:
            A long or exit signal when an action is triggered; otherwise
            ``None``.
        """
        raise NotImplementedError

    def _merge_with_defaults(self, custom_params: dict[str, Any]) -> dict[str, Any]:
        """Merges user-provided parameters with strategy default definitions."""
        metadata = self.get_metadata()
        defaults = {p.name: p.default for p in metadata.parameters}
        defaults.update(custom_params)
        return defaults

    def get_param(self, key: str, default: Any = None) -> Any:
        """Read a merged strategy parameter.

        Args:
            key: Parameter key.
            default: Value returned when the key is absent.

        Returns:
            The configured parameter value or ``default``.
        """
        return self.params.get(key, default)
