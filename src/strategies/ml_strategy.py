# src/strategies/ml_strategy.py
from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.ml_engine.train import FeatureEngineeringPipeline
from src.strategies.base_strategy import BaseStrategy, ParameterDefinition, StrategyMetadata
from src.strategies.registry import StrategyRegistry


@StrategyRegistry.register
class MLInferenceStrategy(BaseStrategy):
    """
    Event-driven machine learning strategy that executes directional inferences
    from trained scikit-learn / gradient boosting model artifacts.
    """

    id = "ml_inference"
    name = "ML Triple-Barrier Inference"
    description = "Generates trading signals via out-of-fold calibrated ML model predictions."
    category = "Machine Learning"

    def __init__(
        self,
        model_path: str = "models/BTC_USD_4h_model.joblib",
        threshold_long: float = 0.60,
        threshold_exit: float = 0.40,
        lookback_window: int = 50,
        model: BaseEstimator | None = None,
        feature_names: list[str] | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.model_path = model_path
        self.threshold_long = float(threshold_long)
        self.threshold_exit = float(threshold_exit)
        self.lookback_window = int(lookback_window)

        self.model = model
        self.feature_names = feature_names or []
        self._history: list[dict[str, Any]] = []
        self._current_position: int = 0

        # Intentar cargar artefacto inicial si existe
        if self.model is None and Path(self.model_path).exists():
            self._load_artifact(self.model_path)

    def _resolve_model_path_for_symbol(self, symbol: str) -> str:
        """Determina la ruta del modelo basándose en el símbolo recibido."""
        clean_sym = symbol.replace("/", "_").replace("-", "_")
        candidate_4h = Path(f"models/{clean_sym}_4h_model.joblib")
        candidate_1d = Path(f"models/{clean_sym}_1d_model.joblib")
        candidate_gen = Path(f"models/{clean_sym}_model.joblib")

        if candidate_4h.exists():
            return str(candidate_4h)
        if candidate_1d.exists():
            return str(candidate_1d)
        if candidate_gen.exists():
            return str(candidate_gen)
        return self.model_path

    def _load_artifact(self, path: str) -> bool:
        """Carga el modelo serializado y el esquema de variables desde disco."""
        if not Path(path).exists():
            return False
        try:
            artifact = joblib.load(path)
            if isinstance(artifact, dict) and "model" in artifact:
                self.model = artifact["model"]
                self.feature_names = artifact.get("feature_names", [])
            else:
                self.model = artifact
                self.feature_names = getattr(artifact, "feature_names_in_", []).tolist()
            self.model_path = path
            return True
        except Exception:
            return False

    @classmethod
    def get_metadata(cls) -> StrategyMetadata:
        return StrategyMetadata(
            id=cls.id,
            name=cls.name,
            description=cls.description,
            category=cls.category,
            parameters=[
                ParameterDefinition(
                    name="model_path",
                    label="Model Artifact Path",
                    param_type="str",
                    default="models/BTC_USD_4h_model.joblib",
                    description="Filesystem path to the trained joblib model artifact",
                ),
                ParameterDefinition(
                    name="threshold_long",
                    label="Long Probability Threshold",
                    param_type="float",
                    default=0.60,
                    min_value=0.50,
                    max_value=0.95,
                    step=0.01,
                    description="Minimum model probability required to trigger a LONG position",
                ),
                ParameterDefinition(
                    name="threshold_exit",
                    label="Exit Probability Threshold",
                    param_type="float",
                    default=0.40,
                    min_value=0.05,
                    max_value=0.50,
                    step=0.01,
                    description="Probability threshold below which an active position is closed",
                ),
                ParameterDefinition(
                    name="lookback_window",
                    label="Feature Warmup Window",
                    param_type="int",
                    default=50,
                    min_value=30,
                    max_value=200,
                    step=5,
                    description="Historical bar buffer required to compute stationary indicators",
                ),
            ],
        )

    def on_bar(self, event: MarketDataEvent) -> SignalEvent | None:
        self._history.append(
            {
                "timestamp": event.timestamp,
                "open": event.open,
                "high": event.high,
                "low": event.low,
                "close": event.close,
                "volume": event.volume,
            }
        )

        # Limitar tamaño del buffer en memoria
        if len(self._history) > (self.lookback_window + 30):
            self._history.pop(0)

        if len(self._history) < self.lookback_window:
            return None

        # Carga dinámica si el modelo no está en memoria
        if self.model is None:
            resolved_path = self._resolve_model_path_for_symbol(event.symbol)
            if not self._load_artifact(resolved_path):
                return None

        # Construcción de características sobre el búfer activo
        df = pd.DataFrame(self._history)
        features = FeatureEngineeringPipeline.build_features(df)

        if features.empty:
            return None

        current_vector = features.iloc[[-1]]
        if self.feature_names:
            missing_cols = [c for c in self.feature_names if c not in current_vector.columns]
            if missing_cols:
                return None
            current_vector = current_vector[self.feature_names]

        # Inferencia rápida
        prob_long = float(self.model.predict_proba(current_vector)[0, 1])

        # Generación de señales según umbral de convicción
        if prob_long >= self.threshold_long and self._current_position == 0:
            self._current_position = 1
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=SignalType.LONG,
                strength=prob_long,
            )

        if prob_long <= self.threshold_exit and self._current_position == 1:
            self._current_position = 0
            return SignalEvent(
                timestamp=event.timestamp,
                symbol=event.symbol,
                signal_type=SignalType.EXIT,
                strength=1.0 - prob_long,
            )

        return None
