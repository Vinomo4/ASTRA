# src/strategies/registry.py
from __future__ import annotations

from typing import Any, Type
from src.strategies.base_strategy import BaseStrategy, StrategyMetadata


class StrategyRegistry:
    """Central registry for discovering and instantiating strategies."""

    _registry: dict[str, Type[BaseStrategy]] = {}

    @classmethod
    def register(cls, strategy_cls: Type[BaseStrategy]) -> Type[BaseStrategy]:
        """Class decorator to register strategy implementations."""
        strategy_id = strategy_cls.id
        if not strategy_id:
            raise ValueError(
                f"Strategy {strategy_cls.__name__} must define a valid 'id' attribute."
            )

        cls._registry[strategy_id] = strategy_cls
        return strategy_cls

    @classmethod
    def get_strategy_class(cls, strategy_id: str) -> Type[BaseStrategy]:
        """Retrieves a strategy class by its registered ID."""
        if strategy_id not in cls._registry:
            available = list(cls._registry.keys())
            raise KeyError(
                f"Strategy '{strategy_id}' not found in registry. Available: {available}"
            )
        return cls._registry[strategy_id]

    @classmethod
    def create(cls, strategy_id: str, **params: Any) -> BaseStrategy:
        """Instantiates a strategy with the provided parameters."""
        strategy_cls = cls.get_strategy_class(strategy_id)
        return strategy_cls(**params)

    @classmethod
    def list_strategies(cls) -> list[StrategyMetadata]:
        """Returns metadata descriptors for all registered strategies for UI discovery."""
        return [strategy_cls.get_metadata() for strategy_cls in cls._registry.values()]

    @classmethod
    def clear(cls) -> None:
        """Clears the registry (primarily for test isolation)."""
        cls._registry.clear()
