# src/backtester/walk_forward.py
from __future__ import annotations

from typing import Any
import pandas as pd

from src.analytics.metrics import PerformanceAnalytics
from src.api.routers.simulation import get_market_data
from src.backtester.event_engine import BacktestEngine
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader
from src.strategies.registry import StrategyRegistry


class WalkForwardEngine:
    def __init__(self, storage: StorageManager | None = None) -> None:
        self.storage = storage or StorageManager()
        self.loader = YFinanceLoader()

    def _fetch_market_data(
        self, symbol: str, start_date: str, end_date: str, timeframe: str = "1d"
    ) -> pd.DataFrame:
        """Loads data via tiered cache (RAM -> DuckDB -> YFinance)."""
        return get_market_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            timeframe=timeframe,
            storage=self.storage,
            loader=self.loader,
        )

    @staticmethod
    def _extract_metric(res: dict[str, Any], key: str, default: float = 0.0) -> float:
        """Safely extracts metrics from flat or nested dictionary payloads."""
        if key in res and res[key] is not None:
            try:
                return float(res[key])
            except (ValueError, TypeError):
                return default

        nested = res.get("trade_analytics")
        if isinstance(nested, dict) and key in nested and nested[key] is not None:
            try:
                return float(nested[key])
            except (ValueError, TypeError):
                return default

        return default

    @staticmethod
    def _extract_timeline(
        equity_curve: Any, is_oos: bool, time_fmt: str = "%Y-%m-%d"
    ) -> list[dict[str, Any]]:
        """Parses Series, dict, or list representation of equity trajectories with correct time format."""
        timeline: list[dict[str, Any]] = []

        if isinstance(equity_curve, dict):
            for k, v in equity_curve.items():
                t_str = pd.to_datetime(k).strftime(time_fmt)
                val = round(float(v), 2) if v is not None else 0.0
                timeline.append(
                    {
                        "time": t_str,
                        "equity_is": None if is_oos else val,
                        "equity_oos": val if is_oos else None,
                        "is_oos": is_oos,
                    }
                )
        elif isinstance(equity_curve, (list, tuple)):
            for item in equity_curve:
                if isinstance(item, dict):
                    t = item.get("time") or item.get("timestamp")
                    v = item.get("value") or item.get("equity")
                else:
                    t = getattr(item, "time", None) or getattr(item, "timestamp", None)
                    v = getattr(item, "value", None) or getattr(item, "equity", None)

                if t is not None and v is not None:
                    t_str = pd.to_datetime(t).strftime(time_fmt)
                    val = round(float(v), 2)
                    timeline.append(
                        {
                            "time": t_str,
                            "equity_is": None if is_oos else val,
                            "equity_oos": val if is_oos else None,
                            "is_oos": is_oos,
                        }
                    )

        return timeline

    def run_split_validation(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
        strategy_id: str,
        strategy_params: dict[str, Any],
        timeframe: str = "1d",
        initial_capital: float = 100_000.0,
        train_ratio: float = 0.70,
        risk_fraction: float = 0.01,
        atr_multiplier_sl: float = 2.0,
        atr_multiplier_tp: float = 4.0,
        commission_bps: float = 5.0,
        commission_fixed: float = 0.0,
        slippage_bps: float = 2.0,
        gap_slippage_enabled: bool = True,
    ) -> dict[str, Any]:
        """
        Partitions chronological historical data into In-Sample (IS) and Out-of-Sample (OOS)
        periods across the selected timeframe to evaluate performance decay and rule stability.
        """
        # 1. Fetch complete historical dataset via cache
        df = self._fetch_market_data(symbol, start_date, end_date, timeframe=timeframe)
        if df.empty or len(df) < 40:
            raise ValueError(
                f"Insufficient historical data for symbol '{symbol}' ({len(df)} bars) with timeframe '{timeframe}'."
            )

        df = df.sort_values("timestamp").reset_index(drop=True)
        split_idx = int(len(df) * train_ratio)

        df_train = df.iloc[:split_idx].copy().reset_index(drop=True)
        df_test = df.iloc[split_idx:].copy().reset_index(drop=True)

        is_intraday = timeframe in ("15m", "1h", "4h", "5m")
        time_fmt = "%Y-%m-%d %H:%M" if is_intraday else "%Y-%m-%d"
        split_date = pd.to_datetime(df.iloc[split_idx]["timestamp"]).strftime(time_fmt)

        # 2. Execute In-Sample Simulation
        strat_is = StrategyRegistry.create(strategy_id, **strategy_params)
        engine_is = BacktestEngine(
            strategy=strat_is,
            initial_capital=initial_capital,
            risk_fraction=risk_fraction,
            atr_multiplier_sl=atr_multiplier_sl,
            atr_multiplier_tp=atr_multiplier_tp,
            commission_bps=commission_bps,
            commission_fixed=commission_fixed,
            slippage_bps=slippage_bps,
            gap_slippage_enabled=gap_slippage_enabled,
        )
        res_is = engine_is.run(df_train)

        # 3. Execute Out-of-Sample Simulation
        strat_oos = StrategyRegistry.create(strategy_id, **strategy_params)
        engine_oos = BacktestEngine(
            strategy=strat_oos,
            initial_capital=initial_capital,
            risk_fraction=risk_fraction,
            atr_multiplier_sl=atr_multiplier_sl,
            atr_multiplier_tp=atr_multiplier_tp,
            commission_bps=commission_bps,
            commission_fixed=commission_fixed,
            slippage_bps=slippage_bps,
            gap_slippage_enabled=gap_slippage_enabled,
        )
        res_oos = engine_oos.run(df_test)

        # 4. Extract Safe In-Sample & Out-of-Sample Metrics
        cagr_is = self._extract_metric(res_is, "cagr", 0.0)
        cagr_oos = self._extract_metric(res_oos, "cagr", 0.0)
        sharpe_is = self._extract_metric(res_is, "sharpe_ratio", 0.0)
        sharpe_oos = self._extract_metric(res_oos, "sharpe_ratio", 0.0)
        max_dd_is = self._extract_metric(res_is, "max_drawdown_pct", 0.0)
        max_dd_oos = self._extract_metric(res_oos, "max_drawdown_pct", 0.0)
        tot_ret_is = self._extract_metric(res_is, "total_return_pct", 0.0)
        tot_ret_oos = self._extract_metric(res_oos, "total_return_pct", 0.0)
        sortino_is = self._extract_metric(res_is, "sortino_ratio", 0.0)
        sortino_oos = self._extract_metric(res_oos, "sortino_ratio", 0.0)

        stats_is = PerformanceAnalytics.calculate_trade_statistics(engine_is.trades)
        stats_oos = PerformanceAnalytics.calculate_trade_statistics(engine_oos.trades)

        win_rate_is = float(stats_is.get("win_rate_pct", 0.0))
        win_rate_oos = float(stats_oos.get("win_rate_pct", 0.0))
        pf_is = float(stats_is.get("profit_factor", 0.0))
        pf_oos = float(stats_oos.get("profit_factor", 0.0))

        trades_is = int(res_is.get("total_trades", len(engine_is.trades)))
        trades_oos = int(res_oos.get("total_trades", len(engine_oos.trades)))

        # Walk-Forward Efficiency Ratio (WFER)
        if cagr_is > 0:
            wfer = cagr_oos / cagr_is
        elif cagr_is == 0:
            wfer = 1.0 if cagr_oos >= 0 else 0.0
        else:
            wfer = 0.0

        # Sharpe Degradation
        if sharpe_is > 0:
            sharpe_decay_pct = ((sharpe_is - sharpe_oos) / sharpe_is) * 100.0
        else:
            sharpe_decay_pct = 0.0

        # Robustness Classification
        if wfer >= 0.60 and sharpe_oos >= 0.8:
            robustness_status = "ROBUST"
        elif wfer >= 0.35 and sharpe_oos >= 0.3:
            robustness_status = "MODERATE"
        else:
            robustness_status = "OVERFITTED"

        # 5. Extract Chronological Trajectory
        timeline_is = self._extract_timeline(
            res_is.get("equity_curve", {}), is_oos=False, time_fmt=time_fmt
        )
        timeline_oos = self._extract_timeline(
            res_oos.get("equity_curve", {}), is_oos=True, time_fmt=time_fmt
        )

        return {
            "symbol": symbol,
            "strategy_id": strategy_id,
            "timeframe": timeframe,
            "train_ratio": train_ratio,
            "split_date": split_date,
            "total_bars": len(df),
            "train_bars": len(df_train),
            "test_bars": len(df_test),
            "robustness_status": robustness_status,
            "wfer": round(wfer, 3),
            "sharpe_decay_pct": round(sharpe_decay_pct, 2),
            "in_sample": {
                "total_return_pct": round(tot_ret_is, 2),
                "cagr": round(cagr_is, 2),
                "sharpe_ratio": round(sharpe_is, 2),
                "sortino_ratio": round(sortino_is, 2),
                "max_drawdown_pct": round(max_dd_is, 2),
                "total_trades": trades_is,
                "win_rate_pct": round(win_rate_is, 2),
                "profit_factor": round(pf_is, 2),
            },
            "out_of_sample": {
                "total_return_pct": round(tot_ret_oos, 2),
                "cagr": round(cagr_oos, 2),
                "sharpe_ratio": round(sharpe_oos, 2),
                "sortino_ratio": round(sortino_oos, 2),
                "max_drawdown_pct": round(max_dd_oos, 2),
                "total_trades": trades_oos,
                "win_rate_pct": round(win_rate_oos, 2),
                "profit_factor": round(pf_oos, 2),
            },
            "combined_timeline": timeline_is + timeline_oos,
        }

    # Backward compatibility alias
    run = run_split_validation
