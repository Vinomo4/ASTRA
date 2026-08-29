"""Discovery and construction registry for trading strategies."""

from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar

if TYPE_CHECKING:
    from src.strategies.base_strategy import BaseStrategy, StrategyMetadata


class StrategyRegistry:
    """Central registry for discovering and instantiating strategies."""

    _registry: ClassVar[dict[str, type[BaseStrategy]]] = {}

    @classmethod
    def register(cls, strategy_cls: type[BaseStrategy]) -> type[BaseStrategy]:
        """Register a strategy implementation by its declared identifier.

        Args:
            strategy_cls: Strategy class to register.

        Returns:
            The unchanged strategy class, allowing decorator use.

        Raises:
            ValueError: If the strategy class has no valid identifier.
        """
        strategy_id = strategy_cls.id
        if not strategy_id:
            raise ValueError(
                f"Strategy {strategy_cls.__name__} must define a valid 'id' attribute."
            )

        cls._registry[strategy_id] = strategy_cls
        return strategy_cls

    @classmethod
    def create(cls, strategy_id: str, **kwargs) -> BaseStrategy:
        """Instantiate a registered strategy.

        Args:
            strategy_id: Stable identifier of the strategy to construct.
            **kwargs: Arguments forwarded to the strategy constructor.

        Returns:
            A configured strategy instance.

        Raises:
            KeyError: If ``strategy_id`` is not registered.
        """
        if strategy_id not in cls._registry:
            raise KeyError(
                f"Strategy '{strategy_id}' not found in registry. "
                f"Available strategies: {list(cls._registry.keys())}"
            )
        return cls._registry[strategy_id](**kwargs)

    @classmethod
    def list_strategies(cls) -> list[StrategyMetadata]:
        """List metadata for all registered strategies.

        Returns:
            Strategy metadata in registration order.
        """
        return [strat_cls.get_metadata() for strat_cls in cls._registry.values()]

    @classmethod
    def clear(cls) -> None:
        """Clear all registrations, primarily for test isolation."""
        cls._registry.clear()
