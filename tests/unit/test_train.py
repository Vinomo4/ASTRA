# tests/unit/test_train.py
from datetime import UTC

import numpy as np
import pandas as pd
import pytest

from src.ml_engine.train import (
    FeatureEngineeringPipeline,
    ModelTrainer,
    TrainingConfig,
)


@pytest.fixture
def synthetic_ohlcv() -> pd.DataFrame:
    np.random.seed(42)
    n = 200
    dates = pd.date_range("2024-01-01", periods=n, freq="h", tz=UTC)

    close = 100.0 + np.cumsum(np.random.randn(n) * 0.8)
    high = close + np.random.uniform(0.1, 1.2, n)
    low = close - np.random.uniform(0.1, 1.2, n)
    open_p = close + np.random.uniform(-0.4, 0.4, n)
    volume = np.random.uniform(500, 5000, n)

    return pd.DataFrame(
        {
            "timestamp": dates,
            "open": open_p,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        },
        index=dates,
    )


class TestTrainingPipeline:
    def test_feature_engineering_pipeline(self, synthetic_ohlcv):
        features = FeatureEngineeringPipeline.build_features(synthetic_ohlcv)
        assert isinstance(features, pd.DataFrame)
        assert "rsi_14" in features.columns
        assert "macd_ratio" in features.columns
        assert "natr_14" in features.columns
        assert "bb_pct_b" in features.columns
        assert "volume_ratio" in features.columns
        assert not features.isna().any().any()

    def test_end_to_end_training(self, synthetic_ohlcv, tmp_path):
        config = TrainingConfig(
            symbol="BTC_USD_1d",
            holding_period=5,
            volatility_span=10,
            n_splits=3,
            optimize_hyperparameters=False,
            model_dir=str(tmp_path),
        )

        trainer = ModelTrainer(config)
        result = trainer.train(synthetic_ohlcv)

        assert result.model is not None
        assert len(result.feature_names) > 0
        assert "accuracy" in result.metrics
        assert "roc_auc" in result.metrics
        assert result.model_path is not None
        assert (tmp_path / "BTC_USD_1d_model.joblib").exists()
