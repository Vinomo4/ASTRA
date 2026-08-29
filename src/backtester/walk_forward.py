"""Rolling walk-forward evaluation for registered trading strategies."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from src.analytics.metrics import PerformanceAnalytics
from src.backtester.event_engine import BacktestEngine
from src.core.events import MarketDataEvent
from src.data_engine.base_loader import BaseDataLoader
from src.data_engine.storage_manager import StorageManager
from src.data_engine.unified_loader import UnifiedDataLoader
from src.features.technical import TechnicalFeatures
from src.ml_engine.train import ModelTrainer, TrainingConfig
from src.strategies.registry import StrategyRegistry


class WalkForwardEngine:
    """Evaluate strategies across sequential out-of-sample windows."""

    def __init__(
        self, storage: StorageManager | None = None, loader: BaseDataLoader | None = None
    ) -> None:
        """Initialize the walk-forward engine.

        Args:
            storage: Market-data storage manager. A default manager is created
                when omitted.
            loader: Market-data loader. A unified loader is created when omitted.
        """
        self.storage = storage or StorageManager()
        self.loader = loader or UnifiedDataLoader()

    def _fetch_market_data(
        self, symbol: str, start_date: str, end_date: str, timeframe: str = "1d"
    ) -> pd.DataFrame:
        """Load market data for a walk-forward evaluation.

        Args:
            symbol: Market symbol to load.
            start_date: Inclusive start date.
            end_date: Inclusive end date.
            timeframe: Requested market-bar timeframe.

        Returns:
            Standardized OHLCV bars for the requested period.
        """
        from src.api.routers.simulation import get_market_data

        return get_market_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            timeframe=timeframe,
            storage=self.storage,
            loader=self.loader,
        )

    def _prepare_strategy_params(
        self,
        strategy_id: str,
        strategy_params: dict[str, Any],
        df_train: pd.DataFrame,
        symbol: str,
        timeframe: str,
        window_tag: str = "is",
    ) -> dict[str, Any]:
        """Prepare strategy parameters for one evaluation window.

        Non-ML strategies retain their supplied parameters. ML inference
        strategies reuse a window-specific model artifact when available or
        train and persist one from the supplied in-sample bars.

        Args:
            strategy_id: Registry identifier for the strategy.
            strategy_params: Caller-supplied strategy parameters.
            df_train: In-sample bars available for model training.
            symbol: Market symbol represented by the training bars.
            timeframe: Market-bar timeframe.
            window_tag: Identifier used to isolate the model artifact.

        Returns:
            A copied parameter mapping, including the ML model path when
            applicable.

        Raises:
            ValueError: If an ML model is required but fewer than 50 training
                bars are available.
        """
        active_params = strategy_params.copy()

        if strategy_id == "ml_inference":
            clean_symbol = symbol.replace("-", "_").replace("/", "_")
            temp_model_id = f"wf_{window_tag}_{clean_symbol}_{timeframe}"
            wf_models_dir = Path("models") / "wf_temp"
            wf_models_dir.mkdir(parents=True, exist_ok=True)
            expected_model_path = wf_models_dir / f"{temp_model_id}_model.joblib"

            # Reuse the cached model to avoid retraining the same window.
            if expected_model_path.exists():
                active_params["model_path"] = str(expected_model_path)
                return active_params

            if df_train.empty or len(df_train) < 50:
                raise ValueError(
                    f"Insufficient training data ({len(df_train)} bars) to fit ML model for {window_tag}."
                )

            df_train_ml = df_train.copy()
            if "timestamp" in df_train_ml.columns:
                df_train_ml["timestamp"] = pd.to_datetime(
                    df_train_ml["timestamp"], utc=True
                ).dt.tz_localize(None)
                df_train_ml.set_index("timestamp", inplace=True)
            elif (
                isinstance(df_train_ml.index, pd.DatetimeIndex) and df_train_ml.index.tz is not None
            ):
                df_train_ml.index = df_train_ml.index.tz_convert("UTC").dt.tz_localize(None)

            df_train_ml.sort_index(inplace=True)

            config = TrainingConfig(
                symbol=temp_model_id,
                target_metric="neg_log_loss",
                pt_sl=[1.5, 1.0],
                holding_period=10,
                volatility_span=20,
                n_splits=3,
                pct_embargo=0.01,
                optimize_hyperparameters=False,
                model_dir=str(wf_models_dir),
            )

            trainer = ModelTrainer(config=config)
            train_result = trainer.train(df_train_ml)
            active_params["model_path"] = train_result.model_path

        return active_params

    def run_rolling_walk_forward(
        self,
        symbol: str,
        start_date: str = "2021-01-01",
        end_date: str = "2025-12-31",
        strategy_id: str = "ml_inference",
        strategy_params: dict[str, Any] | None = None,
        timeframe: str = "1d",
        initial_capital: float = 100_000.0,
        train_duration_months: int = 12,
        test_step_months: int = 1,
        risk_fraction: float = 0.01,
        atr_multiplier_sl: float = 2.0,
        atr_multiplier_tp: float = 4.0,
        commission_bps: float = 5.0,
        commission_fixed: float = 0.0,
        slippage_bps: float = 2.0,
        gap_slippage_enabled: bool = True,
    ) -> dict[str, Any]:
        """Run expanding-window training and rolling out-of-sample evaluation.

        Args:
            symbol: Market symbol to evaluate.
            start_date: Inclusive market-data start date.
            end_date: Inclusive market-data end date.
            strategy_id: Registry identifier for the strategy.
            strategy_params: Parameters used to construct the strategy.
            timeframe: Market-bar timeframe.
            initial_capital: Starting capital for the evaluation.
            train_duration_months: Initial training-window duration in months.
            test_step_months: Duration of each test window in months.
            risk_fraction: Fraction of equity risked per position.
            atr_multiplier_sl: ATR multiplier used for stop-loss sizing.
            atr_multiplier_tp: ATR multiplier used for take-profit sizing.
            commission_bps: Variable commission in basis points.
            commission_fixed: Fixed commission per order.
            slippage_bps: Execution slippage in basis points.
            gap_slippage_enabled: Whether stop fills account for price gaps.

        Returns:
            Out-of-sample performance, robustness, friction, trade, and equity
            curve results across all evaluation windows.

        Raises:
            ValueError: If market data is insufficient, no evaluation window can
                be formed, or no out-of-sample equity points are recorded.
        """
        strategy_params = (strategy_params or {}).copy()

        df = self._fetch_market_data(symbol, start_date, end_date, timeframe=timeframe)
        if df.empty or len(df) < 50:
            raise ValueError(
                f"Insufficient historical data for symbol '{symbol}' ({len(df)} bars) with timeframe '{timeframe}'."
            )

        df["timestamp"] = pd.to_datetime(df["timestamp"])
        if df["timestamp"].dt.tz is not None:
            df["timestamp"] = df["timestamp"].dt.tz_convert("UTC").dt.tz_localize(None)
        df = df.sort_values("timestamp").reset_index(drop=True)

        if "atr" not in df.columns:
            df["atr"] = TechnicalFeatures.calculate_atr(df, period=14).bfill()

        min_date = df["timestamp"].min()
        max_date = df["timestamp"].max()

        windows: list[tuple[pd.Timestamp, pd.Timestamp]] = []
        cur_start = (
            min_date + pd.DateOffset(months=train_duration_months)
            if train_duration_months > 0
            else min_date
        )

        while cur_start < max_date:
            cur_end = cur_start + pd.DateOffset(months=test_step_months)
            if cur_end > max_date:
                cur_end = max_date
            windows.append((cur_start, cur_end))
            cur_start = cur_end

        if not windows:
            raise ValueError(
                "Dataset duration is shorter than the required initial training period."
            )

        all_trades: list[Any] = []
        concatenated_equity: dict[Any, float] = {}
        is_sharpes: list[float] = []
        prev_engine: BacktestEngine | None = None

        lookback_buffer = max(int(strategy_params.get("lookback_window", 50)), 100)

        strat: Any = None
        if strategy_id != "ml_inference":
            strat = StrategyRegistry.create(strategy_id, **strategy_params)
            initial_train_df = df[df["timestamp"] < windows[0][0]].copy().reset_index(drop=True)
            if not initial_train_df.empty:
                warmup_df = initial_train_df.iloc[-lookback_buffer:].copy()
                for _, w_row in warmup_df.iterrows():
                    w_event = MarketDataEvent(
                        timestamp=w_row["timestamp"],
                        symbol=str(w_row.get("symbol", symbol)),
                        open=float(w_row["open"]),
                        high=float(w_row["high"]),
                        low=float(w_row["low"]),
                        close=float(w_row["close"]),
                        volume=float(w_row["volume"]),
                    )
                    strat.on_bar(w_event)

        for idx, (test_start, test_end) in enumerate(windows, 1):
            df_train = df[df["timestamp"] < test_start].copy().reset_index(drop=True)

            if idx == 1 and train_duration_months == 0:
                df_test = (
                    df[(df["timestamp"] >= test_start) & (df["timestamp"] <= test_end)]
                    .copy()
                    .reset_index(drop=True)
                )
            else:
                df_test = (
                    (
                        df[(df["timestamp"] >= test_start) & (df["timestamp"] <= test_end)]
                        if idx == 1
                        else df[(df["timestamp"] > test_start) & (df["timestamp"] <= test_end)]
                    )
                    .copy()
                    .reset_index(drop=True)
                )

            if df_test.empty:
                continue

            if strategy_id == "ml_inference":
                active_params = self._prepare_strategy_params(
                    strategy_id=strategy_id,
                    strategy_params=strategy_params,
                    df_train=df_train,
                    symbol=symbol,
                    timeframe=timeframe,
                    window_tag=f"exp_w{idx}",
                )
                strat = StrategyRegistry.create(strategy_id, **active_params)

                if not df_train.empty:
                    warmup_df = df_train.iloc[-lookback_buffer:].copy()
                    for _, w_row in warmup_df.iterrows():
                        w_event = MarketDataEvent(
                            timestamp=w_row["timestamp"],
                            symbol=str(w_row.get("symbol", symbol)),
                            open=float(w_row["open"]),
                            high=float(w_row["high"]),
                            low=float(w_row["low"]),
                            close=float(w_row["close"]),
                            volume=float(w_row["volume"]),
                        )
                        strat.on_bar(w_event)

            engine = BacktestEngine(
                strategy=strat,
                initial_capital=initial_capital,
                risk_fraction=risk_fraction,
                atr_multiplier_sl=atr_multiplier_sl,
                atr_multiplier_tp=atr_multiplier_tp,
                commission_bps=commission_bps,
                commission_fixed=commission_fixed,
                slippage_bps=slippage_bps,
                gap_slippage_enabled=gap_slippage_enabled,
            )

            if prev_engine is not None:
                engine.capital = prev_engine.capital
                engine.positions = prev_engine.positions
                engine.entry_nominal_prices = getattr(prev_engine, "entry_nominal_prices", {})
                engine.entry_fees = getattr(prev_engine, "entry_fees", {})
                engine.entry_slippages = getattr(prev_engine, "entry_slippages", {})
                engine.pending_order = getattr(prev_engine, "pending_order", None)

            engine.run(df_test)
            all_trades.extend(engine.trades)

            for eq_item in engine.equity_history:
                concatenated_equity[eq_item["timestamp"]] = eq_item["equity"]

            prev_engine = engine

            if strategy_id == "ml_inference" and not df_train.empty:
                try:
                    strat_is = StrategyRegistry.create(strategy_id, **active_params)
                    eng_is = BacktestEngine(
                        strategy=strat_is,
                        initial_capital=initial_capital,
                        risk_fraction=risk_fraction,
                        atr_multiplier_sl=atr_multiplier_sl,
                        atr_multiplier_tp=atr_multiplier_tp,
                        commission_bps=commission_bps,
                        slippage_bps=slippage_bps,
                    )
                    res_is = eng_is.run(df_train)
                    is_sharpes.append(float(res_is["sharpe_ratio"]))
                except Exception:
                    pass

        equity_series = pd.Series(concatenated_equity).sort_index()
        if equity_series.empty:
            raise ValueError("No equity points recorded across out-of-sample evaluation windows.")

        max_dd, _ = PerformanceAnalytics.calculate_max_drawdown(equity_series)
        total_return_pct = float((equity_series.iloc[-1] / initial_capital - 1.0) * 100.0)
        cagr = float(PerformanceAnalytics.calculate_cagr(equity_series) * 100.0)
        sharpe = float(PerformanceAnalytics.calculate_sharpe_ratio(equity_series))
        sortino = float(PerformanceAnalytics.calculate_sortino_ratio(equity_series))
        trade_stats = PerformanceAnalytics.calculate_trade_statistics(all_trades)

        mean_sharpe_is = float(pd.Series(is_sharpes).mean()) if is_sharpes else sharpe
        wfer = float((sharpe / mean_sharpe_is) if mean_sharpe_is > 0 else 0.0)

        if sharpe >= 0.8 and wfer >= 0.50:
            validation_status = "ROBUST"
        elif sharpe >= 0.3 and wfer >= 0.25:
            validation_status = "MODERATE"
        else:
            validation_status = "OVERFITTED"

        # Support friction metrics from both TradeRecord objects and mappings.
        total_commissions_usd = float(
            sum(
                (t.get("commission", 0.0) if isinstance(t, dict) else getattr(t, "commission", 0.0))
                for t in all_trades
            )
        )
        total_slippage_usd = float(
            sum(
                (
                    t.get("slippage_cost", t.get("slippage", 0.0))
                    if isinstance(t, dict)
                    else getattr(t, "slippage_cost", getattr(t, "slippage", 0.0))
                )
                for t in all_trades
            )
        )
        total_friction_usd = total_commissions_usd + total_slippage_usd
        total_friction_pct = float((total_friction_usd / initial_capital) * 100.0)
        gross_return_pct = float(total_return_pct + total_friction_pct)
        cost_drag_pct = float(
            (total_friction_pct / gross_return_pct * 100.0) if gross_return_pct > 0 else 100.0
        )

        is_intraday = timeframe in ("15m", "1h", "4h", "5m")
        time_fmt = "%Y-%m-%d %H:%M" if is_intraday else "%Y-%m-%d"

        oos_curve = [
            {
                "time": ts.strftime(time_fmt) if hasattr(ts, "strftime") else str(ts),
                "value": round(float(val), 2),
            }
            for ts, val in equity_series.items()
        ]

        return {
            "symbol": symbol,
            "strategy_id": strategy_id,
            "timeframe": timeframe,
            "evaluation_period": f"{windows[0][0].strftime('%Y-%m-%d')} -> {windows[-1][1].strftime('%Y-%m-%d')}",
            "total_windows": len(windows),
            "train_duration_months": train_duration_months,
            "test_step_months": test_step_months,
            "initial_capital": initial_capital,
            "final_equity": round(float(equity_series.iloc[-1]), 2),
            "total_return_pct": round(total_return_pct, 6),
            "cagr": round(cagr, 6),
            "sharpe_ratio": round(sharpe, 6),
            "sortino_ratio": round(sortino, 6),
            "max_drawdown_pct": round(float(max_dd * 100.0), 6),
            "profit_factor": round(float(trade_stats.get("profit_factor", 0.0)), 2),
            "win_rate_pct": round(float(trade_stats.get("win_rate_pct", 0.0)), 2),
            "total_trades": len(all_trades),
            "sharpe_is": round(mean_sharpe_is, 6),
            "sharpe_oos": round(sharpe, 6),
            "wfer": round(wfer, 6),
            "validation_status": validation_status,
            "gross_return_pct": round(gross_return_pct, 6),
            "total_commissions_usd": round(total_commissions_usd, 2),
            "total_slippage_usd": round(total_slippage_usd, 2),
            "total_friction_pct": round(total_friction_pct, 4),
            "cost_drag_pct": round(cost_drag_pct, 2),
            "trades": all_trades,
            "oos_equity_curve": oos_curve,
        }
