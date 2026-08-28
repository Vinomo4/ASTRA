# src/strategies/registry.py
from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar

if TYPE_CHECKING:
    from src.strategies.base_strategy import BaseStrategy, StrategyMetadata


class StrategyRegistry:
    """Central registry for discovering and instantiating strategies."""

    _registry: ClassVar[dict[str, type[BaseStrategy]]] = {}

    @classmethod
    def register(cls, strategy_cls: type[BaseStrategy]) -> type[BaseStrategy]:
        """Class decorator to register strategy implementations."""
        strategy_id = strategy_cls.id
        if not strategy_id:
            raise ValueError(
                f"Strategy {strategy_cls.__name__} must define a valid 'id' attribute."
            )

        cls._registry[strategy_id] = strategy_cls
        return strategy_cls

    @classmethod
    def create(cls, strategy_id: str, **kwargs) -> BaseStrategy:
        if strategy_id not in cls._registry:
            raise KeyError(
                f"Strategy '{strategy_id}' not found in registry. "
                f"Available strategies: {list(cls._registry.keys())}"
            )
        return cls._registry[strategy_id](**kwargs)

    @classmethod
    def list_strategies(cls) -> list[StrategyMetadata]:
        return [strat_cls.get_metadata() for strat_cls in cls._registry.values()]

    @classmethod
    def clear(cls) -> None:
        """Clears the registry (primarily for test isolation)."""
        cls._registry.clear()
