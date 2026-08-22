# src/backtester/comparator.py
from __future__ import annotations

from typing import Any

import pandas as pd

from src.backtester.event_engine import BacktestEngine
from src.data_engine.storage_manager import StorageManager
from src.data_engine.yfinance_loader import YFinanceLoader
from src.strategies.registry import StrategyRegistry


class ComparatorEngine:
    def __init__(self, storage: StorageManager | None = None) -> None:
        self.storage = storage or StorageManager()
        self.loader = YFinanceLoader()

    def _fetch_market_data(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
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

        bench = res.get("benchmark_analytics")
        if isinstance(bench, dict) and key in bench and bench[key] is not None:
            try:
                return float(bench[key])
            except (ValueError, TypeError):
                return default

        return default

    def run_comparison(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
        strategy_a_id: str,
        strategy_a_params: dict[str, Any],
        strategy_a_name: str,
        strategy_b_id: str,
        strategy_b_params: dict[str, Any],
        strategy_b_name: str,
        initial_capital: float = 100_000.0,
        risk_fraction: float = 0.01,
        atr_multiplier_sl: float = 2.0,
        atr_multiplier_tp: float = 4.0,
        commission_bps: float = 5.0,
        commission_fixed: float = 0.0,
        slippage_bps: float = 2.0,
        gap_slippage_enabled: bool = True,
    ) -> dict[str, Any]:
        """Runs identical simulations for two distinct models and computes alpha attribution."""
        df = self._fetch_market_data(symbol, start_date, end_date)
        if df.empty or len(df) < 50:
            raise ValueError(
                f"Insufficient historical data for symbol '{symbol}' ({len(df)} bars)."
            )

        df = df.sort_values("timestamp").reset_index(drop=True)

        # 1. Execute Strategy A Simulation
        strat_a = StrategyRegistry.create(strategy_a_id, **strategy_a_params)
        engine_a = BacktestEngine(
            strategy=strat_a,
            initial_capital=initial_capital,
            risk_fraction=risk_fraction,
            atr_multiplier_sl=atr_multiplier_sl,
            atr_multiplier_tp=atr_multiplier_tp,
            commission_bps=commission_bps,
            commission_fixed=commission_fixed,
            slippage_bps=slippage_bps,
            gap_slippage_enabled=gap_slippage_enabled,
        )
        res_a = engine_a.run(df)

        # 2. Execute Strategy B Simulation
        strat_b = StrategyRegistry.create(strategy_b_id, **strategy_b_params)
        engine_b = BacktestEngine(
            strategy=strat_b,
            initial_capital=initial_capital,
            risk_fraction=risk_fraction,
            atr_multiplier_sl=atr_multiplier_sl,
            atr_multiplier_tp=atr_multiplier_tp,
            commission_bps=commission_bps,
            commission_fixed=commission_fixed,
            slippage_bps=slippage_bps,
            gap_slippage_enabled=gap_slippage_enabled,
        )
        res_b = engine_b.run(df)

        # 3. Process Model Metrics
        frictions_a = (res_a.get("total_fees_paid") or 0.0) + (
            res_a.get("total_slippage_paid") or 0.0
        )
        frictions_b = (res_b.get("total_fees_paid") or 0.0) + (
            res_b.get("total_slippage_paid") or 0.0
        )

        metrics_a = {
            "strategy_name": strategy_a_name,
            "total_return_pct": round(self._extract_metric(res_a, "total_return_pct"), 2),
            "cagr": round(self._extract_metric(res_a, "cagr"), 2),
            "sharpe_ratio": round(self._extract_metric(res_a, "sharpe_ratio"), 2),
            "sortino_ratio": round(self._extract_metric(res_a, "sortino_ratio"), 2),
            "max_drawdown_pct": round(self._extract_metric(res_a, "max_drawdown_pct"), 2),
            "win_rate_pct": round(self._extract_metric(res_a, "win_rate_pct"), 2),
            "profit_factor": round(self._extract_metric(res_a, "profit_factor"), 2),
            "total_trades": int(res_a.get("total_trades", len(res_a.get("trades", [])))),
            "alpha": round(self._extract_metric(res_a, "alpha"), 2),
            "beta": round(self._extract_metric(res_a, "beta"), 2),
            "total_frictions": round(frictions_a, 2),
        }

        metrics_b = {
            "strategy_name": strategy_b_name,
            "total_return_pct": round(self._extract_metric(res_b, "total_return_pct"), 2),
            "cagr": round(self._extract_metric(res_b, "cagr"), 2),
            "sharpe_ratio": round(self._extract_metric(res_b, "sharpe_ratio"), 2),
            "sortino_ratio": round(self._extract_metric(res_b, "sortino_ratio"), 2),
            "max_drawdown_pct": round(self._extract_metric(res_b, "max_drawdown_pct"), 2),
            "win_rate_pct": round(self._extract_metric(res_b, "win_rate_pct"), 2),
            "profit_factor": round(self._extract_metric(res_b, "profit_factor"), 2),
            "total_trades": int(res_b.get("total_trades", len(res_b.get("trades", [])))),
            "alpha": round(self._extract_metric(res_b, "alpha"), 2),
            "beta": round(self._extract_metric(res_b, "beta"), 2),
            "total_frictions": round(frictions_b, 2),
        }

        # 4. Compute Alpha Attribution Deltas (Model A minus Model B)
        delta_ret = metrics_a["total_return_pct"] - metrics_b["total_return_pct"]
        delta_cagr = metrics_a["cagr"] - metrics_b["cagr"]
        delta_sharpe = metrics_a["sharpe_ratio"] - metrics_b["sharpe_ratio"]
        delta_mdd = metrics_a["max_drawdown_pct"] - metrics_b["max_drawdown_pct"]
        delta_wr = metrics_a["win_rate_pct"] - metrics_b["win_rate_pct"]
        delta_alpha = metrics_a["alpha"] - metrics_b["alpha"]

        if delta_sharpe > 0.1 or (abs(delta_sharpe) <= 0.1 and delta_ret > 0):
            outperforming = "A"
        elif delta_sharpe < -0.1 or (abs(delta_sharpe) <= 0.1 and delta_ret < 0):
            outperforming = "B"
        else:
            outperforming = "TIE"

        attribution = {
            "delta_return_pct": round(delta_ret, 2),
            "delta_cagr": round(delta_cagr, 2),
            "delta_sharpe": round(delta_sharpe, 2),
            "delta_max_dd": round(delta_mdd, 2),
            "delta_win_rate": round(delta_wr, 2),
            "delta_alpha": round(delta_alpha, 2),
            "outperforming_strategy": outperforming,
        }

        # 5. Build Unified Timeline Curve
        eq_map_a = {
            str(k).split(" ")[0].split("T")[0]: float(v) for k, v in res_a["equity_curve"].items()
        }
        eq_map_b = {
            str(k).split(" ")[0].split("T")[0]: float(v) for k, v in res_b["equity_curve"].items()
        }
        bench_map = {
            str(b["time"]).split(" ")[0].split("T")[0]: float(b["equity"])
            for b in res_a.get("benchmark_curve", [])
        }

        all_dates = sorted(set(eq_map_a.keys()) | set(eq_map_b.keys()) | set(bench_map.keys()))
        timeline = []
        for d in all_dates:
            timeline.append(
                {
                    "time": d,
                    "equity_a": round(eq_map_a.get(d, initial_capital), 2),
                    "equity_b": round(eq_map_b.get(d, initial_capital), 2),
                    "benchmark_equity": round(bench_map.get(d, initial_capital), 2),
                }
            )

        return {
            "symbol": symbol,
            "start_date": start_date,
            "end_date": end_date,
            "strategy_a": metrics_a,
            "strategy_b": metrics_b,
            "attribution": attribution,
            "timeline": timeline,
        }
