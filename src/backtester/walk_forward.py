# src/backtester/walk_forward.py
from __future__ import annotations

from typing import Any
import pandas as pd

from src.backtester.event_engine import BacktestEngine
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader
from src.strategies.registry import StrategyRegistry


class WalkForwardEngine:
    def __init__(self, storage: StorageManager | None = None) -> None:
        self.storage = storage or StorageManager()
        self.loader = YFinanceLoader()

    def _fetch_market_data(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        """Loads data from local DuckDB or fetches via YFinanceLoader with fallback methods."""
        df = self.storage.load_ohlcv(symbol, start_date, end_date)
        if not df.empty:
            return df

        if hasattr(self.loader, "fetch_data"):
            df = self.loader.fetch_data(symbol, start_date, end_date)
        elif hasattr(self.loader, "fetch"):
            df = self.loader.fetch(symbol, start_date, end_date)
        elif hasattr(self.loader, "load_data"):
            df = self.loader.load_data(symbol, start_date, end_date)
        elif hasattr(self.loader, "load"):
            df = self.loader.load(symbol, start_date, end_date)
        else:
            raise AttributeError("YFinanceLoader has no recognized fetch or load method.")

        if not df.empty:
            self.storage.save_ohlcv(df)

        return df

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
    def _extract_timeline(equity_curve: Any, is_oos: bool) -> list[dict[str, Any]]:
        """Parses Series, dict, or list representation of equity trajectories."""
        timeline: list[dict[str, Any]] = []

        if isinstance(equity_curve, dict):
            for k, v in equity_curve.items():
                t_str = str(k).split(" ")[0].split("T")[0]
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
                    t_str = str(t).split(" ")[0].split("T")[0]
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
        periods to evaluate performance decay and rule stability.
        """
        # 1. Fetch complete historical dataset
        df = self._fetch_market_data(symbol, start_date, end_date)
        if df.empty or len(df) < 50:
            raise ValueError(
                f"Insufficient historical data for symbol '{symbol}' ({len(df)} bars)."
            )

        df = df.sort_values("timestamp").reset_index(drop=True)
        split_idx = int(len(df) * train_ratio)

        df_train = df.iloc[:split_idx].copy().reset_index(drop=True)
        df_test = df.iloc[split_idx:].copy().reset_index(drop=True)

        split_date = str(df.iloc[split_idx]["timestamp"]).split(" ")[0].split("T")[0]

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
        win_rate_is = self._extract_metric(res_is, "win_rate_pct", 0.0)
        win_rate_oos = self._extract_metric(res_oos, "win_rate_pct", 0.0)
        pf_is = self._extract_metric(res_is, "profit_factor", 0.0)
        pf_oos = self._extract_metric(res_oos, "profit_factor", 0.0)

        trades_is = int(res_is.get("total_trades", len(res_is.get("trades", []))))
        trades_oos = int(res_oos.get("total_trades", len(res_oos.get("trades", []))))

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

        # Qualitative Robustness Classification
        if wfer >= 0.60 and sharpe_oos >= 0.8:
            robustness_status = "ROBUST"
        elif wfer >= 0.35 and sharpe_oos >= 0.3:
            robustness_status = "MODERATE"
        else:
            robustness_status = "OVERFITTED"

        # 5. Extract Chronological Trajectory
        timeline_is = self._extract_timeline(res_is.get("equity_curve", {}), is_oos=False)
        timeline_oos = self._extract_timeline(res_oos.get("equity_curve", {}), is_oos=True)

        return {
            "symbol": symbol,
            "strategy_id": strategy_id,
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
