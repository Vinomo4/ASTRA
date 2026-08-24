# tests/strategies/test_ml_strategy.py
from datetime import UTC, datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import HistGradientBoostingClassifier

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.ml_engine.train import FeatureEngineeringPipeline
from src.strategies.ml_strategy import MLInferenceStrategy
from src.strategies.registry import StrategyRegistry


@pytest.fixture
def mock_trained_model_artifact(tmp_path: Path) -> str:
    """Creates and saves a fitted scikit-learn pipeline artifact for testing."""
    dates = pd.date_range("2024-01-01", periods=100, freq="h", tz=UTC)
    df = pd.DataFrame(
        {
            "timestamp": dates,
            "open": np.linspace(100, 150, 100),
            "high": np.linspace(101, 152, 100),
            "low": np.linspace(99, 149, 100),
            "close": np.linspace(100, 150, 100),
            "volume": np.full(100, 1000.0),
        },
        index=dates,
    )

    features = FeatureEngineeringPipeline.build_features(df)
    y = np.array([1 if i % 2 == 0 else 0 for i in range(len(features))])

    model = HistGradientBoostingClassifier(random_state=42)
    model.fit(features, y)

    artifact_path = tmp_path / "mock_model.joblib"
    joblib.dump(
        {
            "model": model,
            "feature_names": list(features.columns),
            "metrics": {"accuracy": 0.85},
        },
        artifact_path,
    )

    return str(artifact_path)


class TestMLInferenceStrategy:
    def test_metadata_contract(self):
        meta = MLInferenceStrategy.get_metadata()
        assert meta.id == "ml_inference"
        param_names = [p.name for p in meta.parameters]
        assert "model_path" in param_names
        assert "threshold_long" in param_names
        assert "threshold_exit" in param_names
        assert "lookback_window" in param_names

    def test_registry_resolution(self, mock_trained_model_artifact):
        strat = StrategyRegistry.create(
            "ml_inference",
            model_path=mock_trained_model_artifact,
            threshold_long=0.65,
        )
        assert isinstance(strat, MLInferenceStrategy)
        assert strat.threshold_long == 0.65

    def test_warmup_buffer_behavior(self, mock_trained_model_artifact):
        strat = MLInferenceStrategy(
            model_path=mock_trained_model_artifact,
            lookback_window=35,
        )

        base_dt = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(30):
            event = MarketDataEvent(
                timestamp=base_dt + timedelta(hours=i),
                symbol="BTC-USD",
                open=100.0 + i,
                high=101.0 + i,
                low=99.0 + i,
                close=100.5 + i,
                volume=1000.0,
            )
            sig = strat.on_bar(event)
            assert sig is None

    def test_signal_generation_flow(self, mock_trained_model_artifact):
        strat = MLInferenceStrategy(
            model_path=mock_trained_model_artifact,
            threshold_long=0.51,
            threshold_exit=0.49,
            lookback_window=30,
        )

        base_dt = datetime(2024, 1, 1, tzinfo=UTC)
        signals: list[SignalEvent] = []
        for i in range(60):
            event = MarketDataEvent(
                timestamp=base_dt + timedelta(hours=i),
                symbol="BTC-USD",
                open=100.0 + (i * 0.5),
                high=101.0 + (i * 0.5),
                low=99.0 + (i * 0.5),
                close=100.5 + (i * 0.5),
                volume=1000.0 + (i * 10),
            )
            sig = strat.on_bar(event)
            if sig is not None:
                signals.append(sig)

        assert len(signals) > 0
        assert any(s.signal_type in {SignalType.LONG, SignalType.EXIT} for s in signals)
