// src/components/KPIGrid.tsx
import { memo, useState } from 'react';
import { DollarSign, TrendingUp, Activity, ShieldAlert, Scale, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import type { BacktestResult } from '../types/backtest';

interface KPIGridProps {
  results: BacktestResult;
}

export const KPIGrid = memo(({ results }: KPIGridProps) => {
  const [showFrictionPopover, setShowFrictionPopover] = useState(false);

  const fees = results.total_fees_paid ?? 0;
  const slippage = results.total_slippage_paid ?? 0;
  const totalFrictions = fees + slippage;
  const capitalDragPct = results.initial_capital > 0 ? (totalFrictions / results.initial_capital) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* 1. Final Equity */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <DollarSign size={15} className="text-emerald-400" /> Final Equity
        </div>
        <div className="text-lg font-bold font-mono text-white">
          ${results.final_equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-xs mt-1 font-semibold ${results.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {results.total_return_pct >= 0 ? '+' : ''}{results.total_return_pct.toFixed(2)}% Return
        </div>
      </div>

      {/* 2. CAGR */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <TrendingUp size={15} className="text-blue-400" /> Strategy CAGR
        </div>
        <div className="text-lg font-bold font-mono text-white">{results.cagr.toFixed(2)}%</div>
        <div className="text-xs text-slate-400 mt-1 truncate">
          B&H: <span className="text-slate-200 font-semibold">{results.benchmark_analytics.benchmark_cagr.toFixed(2)}%</span>
        </div>
      </div>

      {/* 3. Sharpe & Sortino */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <Activity size={15} className="text-purple-400" /> Sharpe Ratio
        </div>
        <div className="text-lg font-bold font-mono text-white">{results.sharpe_ratio.toFixed(2)}</div>
        <div className="text-xs text-slate-500 mt-1">Sortino: {results.sortino_ratio.toFixed(2)}</div>
      </div>

      {/* 4. Drawdown */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <ShieldAlert size={15} className="text-rose-400" /> Max Drawdown
        </div>
        <div className="text-lg font-bold font-mono text-rose-400">{results.max_drawdown_pct.toFixed(2)}%</div>
        <div className="text-xs text-slate-500 mt-1">Calmar: {results.benchmark_analytics.calmar_ratio.toFixed(2)}</div>
      </div>

      {/* 5. Alpha & Beta */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <Scale size={15} className="text-indigo-400" /> Alpha & Beta
        </div>
        <div className="text-lg font-bold font-mono text-white">
          <span className={results.benchmark_analytics.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {results.benchmark_analytics.alpha >= 0 ? '+' : ''}{results.benchmark_analytics.alpha.toFixed(2)}%
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Beta (β): <span className="text-slate-200 font-semibold">{results.benchmark_analytics.beta.toFixed(2)}</span>
        </div>
      </div>

      {/* 6. Cost Drag (Expandable Popover) */}
      <div 
        onClick={() => setShowFrictionPopover(!showFrictionPopover)}
        className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer relative group transition"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
          <span className="flex items-center gap-1.5">
            <Receipt size={15} className="text-amber-400" /> Cost Drag
          </span>
          <span className="text-slate-500 group-hover:text-slate-300">
            {showFrictionPopover ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </div>
        <div className="text-lg font-bold font-mono text-amber-400">
          -${totalFrictions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Drag: <span className="text-rose-400 font-semibold">-{capitalDragPct.toFixed(2)}%</span>
        </div>

        {/* Popover */}
        {showFrictionPopover && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="absolute top-full right-0 mt-2 w-52 bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-2xl z-40 text-xs"
          >
            <div className="text-slate-300 font-semibold mb-2 pb-1 border-b border-slate-800">
              Friction Composition
            </div>
            <div className="flex justify-between py-1 text-slate-400">
              <span>Commissions:</span>
              <span className="font-mono text-slate-200">${fees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-400">
              <span>Slippage:</span>
              <span className="font-mono text-slate-200">${slippage.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 pt-1.5 border-t border-slate-800 text-slate-200 font-bold">
              <span>Total Cost:</span>
              <span className="font-mono text-amber-400">${totalFrictions.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});