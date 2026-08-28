# src/api/schemas/__init__.py
from src.api.schemas.backtest import (
    ActivePosition,
    BacktestRequest,
    BacktestResponse,
    BenchmarkAnalytics,
    BenchmarkPoint,
    EquityPoint,
    ExecutionMarker,
    MonteCarloAnalytics,
    OHLCPoint,
    PortfolioSnapshot,
    SimulationBandPoint,
    StrategyListResponse,
    TradeAnalytics,
    TradeItem,
)
from src.api.schemas.comparison import (
    AlphaAttributionDelta,
    ComparisonModelConfig,
    ComparisonRequest,
    ComparisonResponse,
    ComparisonTimelinePoint,
    StrategyComparisonMetrics,
)
from src.api.schemas.presets import (
    StrategyPresetCreate,
    StrategyPresetListResponse,
    StrategyPresetResponse,
)
from src.api.schemas.walk_forward import (
    OOSEquityPoint,
    ValidationMetricsBlock,
    ValidationTimelinePoint,
    WalkForwardRequest,
    WalkForwardResponse,
)

__all__ = [
    # Backtest
    "StrategyListResponse",
    "SimulationBandPoint",
    "MonteCarloAnalytics",
    "BacktestRequest",
    "TradeItem",
    "OHLCPoint",
    "PortfolioSnapshot",
    "BenchmarkPoint",
    "EquityPoint",
    "ExecutionMarker",
    "ActivePosition",
    "TradeAnalytics",
    "BenchmarkAnalytics",
    "BacktestResponse",
    # Presets
    "StrategyPresetCreate",
    "StrategyPresetResponse",
    "StrategyPresetListResponse",
    # Walk Forward
    "WalkForwardRequest",
    "OOSEquityPoint",
    "ValidationMetricsBlock",
    "ValidationTimelinePoint",
    "WalkForwardResponse",
    # Comparison
    "ComparisonModelConfig",
    "ComparisonRequest",
    "StrategyComparisonMetrics",
    "AlphaAttributionDelta",
    "ComparisonTimelinePoint",
    "ComparisonResponse",
]
