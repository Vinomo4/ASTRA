// src/components/KPIGrid.tsx
import { memo } from 'react';
import { DollarSign, TrendingUp, Activity, ShieldAlert, Scale } from 'lucide-react';
import type { BacktestResult } from '../types/backtest';

interface KPIGridProps {
  results: BacktestResult;
}

export const KPIGrid = memo(({ results }: KPIGridProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
        <DollarSign size={16} className="text-emerald-400" /> Final Equity
      </div>
      <div className="text-xl font-bold text-white">
        ${results.final_equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`text-xs mt-1 font-semibold ${results.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {results.total_return_pct >= 0 ? '+' : ''}{results.total_return_pct.toFixed(2)}% Total Return
      </div>
    </div>

    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
        <TrendingUp size={16} className="text-blue-400" /> Strategy CAGR
      </div>
      <div className="text-xl font-bold text-white">{results.cagr.toFixed(2)}%</div>
      <div className="text-xs text-slate-400 mt-1">
        Buy & Hold: <span className="text-slate-200 font-semibold">{results.benchmark_analytics.benchmark_cagr.toFixed(2)}%</span>
      </div>
    </div>

    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
        <Activity size={16} className="text-purple-400" /> Sharpe Ratio
      </div>
      <div className="text-xl font-bold text-white">{results.sharpe_ratio.toFixed(2)}</div>
      <div className="text-xs text-slate-500 mt-1">Sortino: {results.sortino_ratio.toFixed(2)}</div>
    </div>

    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
        <ShieldAlert size={16} className="text-rose-400" /> Max Drawdown
      </div>
      <div className="text-xl font-bold text-rose-400">{results.max_drawdown_pct.toFixed(2)}%</div>
      <div className="text-xs text-slate-500 mt-1">Calmar: {results.benchmark_analytics.calmar_ratio.toFixed(2)}</div>
    </div>

    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
        <Scale size={16} className="text-indigo-400" /> Alpha & Beta
      </div>
      <div className="text-xl font-bold text-white">
        <span className={results.benchmark_analytics.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
          {results.benchmark_analytics.alpha >= 0 ? '+' : ''}{results.benchmark_analytics.alpha.toFixed(2)}%
        </span>
      </div>
      <div className="text-xs text-slate-400 mt-1">
        Beta (β): <span className="text-slate-200 font-semibold">{results.benchmark_analytics.beta.toFixed(2)}</span>
      </div>
    </div>
  </div>
));