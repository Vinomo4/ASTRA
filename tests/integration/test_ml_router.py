# tests/api/test_ml_router.py
from datetime import UTC
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_ohlcv_data():
    dates = pd.date_range("2023-01-01", periods=100, freq="D", tz=UTC)
    close = 100.0 + np.cumsum(np.random.randn(100) * 1.5)
    return pd.DataFrame(
        {
            "timestamp": dates,
            "open": close,
            "high": close + 1.0,
            "low": close - 1.0,
            "close": close,
            "volume": np.full(100, 1000.0),
        },
        index=dates,
    )


class TestMLRouter:
    @patch("src.api.routers.ml_router.StorageManager")
    def test_train_endpoint_flow(self, mock_storage_cls, mock_ohlcv_data, client, tmp_path):
        mock_storage = MagicMock()
        mock_storage.load_bars.return_value = mock_ohlcv_data
        mock_storage_cls.return_value = mock_storage

        payload = {
            "symbol": "BTC-USD",
            "start_date": "2023-01-01T00:00:00Z",
            "end_date": "2023-04-10T00:00:00Z",
            "holding_period": 5,
            "volatility_span": 10,
            "n_splits": 3,
            "optimize_hyperparameters": False,
        }

        with patch("src.api.routers.ml_router.MODELS_DIR", str(tmp_path)):
            response = client.post("/api/backtest/ml/train", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["symbol"] == "BTC-USD"
            assert data["status"] == "completed"
            assert "accuracy" in data["metrics"]
            assert len(data["feature_names"]) > 0

    def test_list_models_endpoint(self, client, tmp_path):
        with patch("src.api.routers.ml_router.MODELS_DIR", str(tmp_path)):
            response = client.get("/api/backtest/ml/models")
            assert response.status_code == 200
            data = response.json()
            assert "models" in data
            assert isinstance(data["models"], list)
