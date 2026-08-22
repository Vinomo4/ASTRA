// src/components/views/StressTestingView.tsx
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useBacktest } from '../../context/BacktestContext';
import { MonteCarloPanel } from '../MonteCarloPanel';

export const StressTestingView: React.FC = () => {
  const { results, setActiveTab } = useBacktest();

  if (!results || !results.monte_carlo) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <AlertCircle size={36} className="mx-auto mb-3 text-slate-500" />
        <p className="font-semibold text-slate-200">No Monte Carlo Simulation Available</p>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Execute a backtest run in Strategy Studio with sufficient closed trades ($N \ge 3$).
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
        >
          Open Strategy Studio
        </button>
      </div>
    );
  }

  const mc = results.monte_carlo;

  return (
    <div className="space-y-6">
      {/* Top Statistical Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase">Resample Bootstrap Runs</span>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{mc.num_simulations.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across {mc.trade_count} empirical trades</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase">Risk of Ruin (Barrier)</span>
          <p className={`text-2xl font-bold mt-1 font-mono ${mc.risk_of_ruin_pct > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {mc.risk_of_ruin_pct.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Ruin threshold set at {mc.ruin_threshold_pct}% Max DD</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase">99% Value at Risk (VaR)</span>
          <p className="text-2xl font-bold text-amber-400 mt-1 font-mono">{mc.var_99_pct.toFixed(2)}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Single-trade 99% percentile loss</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase">99% Expected Shortfall (CVaR)</span>
          <p className="text-2xl font-bold text-rose-500 mt-1 font-mono">{mc.cvar_99_pct.toFixed(2)}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Average loss in the worst 1% tail</p>
        </div>
      </div>

      {/* Main Monte Carlo Fan Chart Component */}
      <MonteCarloPanel monteCarlo={mc} />
    </div>
  );
};