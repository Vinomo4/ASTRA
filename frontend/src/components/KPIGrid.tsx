// src/components/KPIGrid.tsx
import { Activity, ChevronDown, ChevronUp, DollarSign, Receipt, Scale, ShieldAlert, TrendingUp } from 'lucide-react';
import { memo, useState } from 'react';
import type { BacktestResult } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

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
          <DollarSign size={15} className="text-emerald-400" /> Patrimonio final
        </div>
        <div className="text-lg font-bold font-mono text-white">
          {formatCurrency(results.final_equity)}
        </div>
        <div className={`text-xs mt-1 font-semibold ${results.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatPercent(results.total_return_pct)} de rentabilidad
        </div>
      </div>

      {/* 2. CAGR */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <TrendingUp size={15} className="text-blue-400" /> CAGR de la estrategia
        </div>
        <div className="text-lg font-bold font-mono text-white">{formatPercent(results.cagr, false)}</div>
        <div className="text-xs text-slate-400 mt-1 truncate">
          Buy & Hold: <span className="text-slate-200 font-semibold">{formatPercent(results.benchmark_analytics.benchmark_cagr, false)}</span>
        </div>
      </div>

      {/* 3. Sharpe & Sortino */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <Activity size={15} className="text-purple-400" /> Ratio de Sharpe
        </div>
        <div className="text-lg font-bold font-mono text-white">{formatNumber(results.sharpe_ratio, 2, 2)}</div>
        <div className="text-xs text-slate-500 mt-1">Sortino: {formatNumber(results.sortino_ratio, 2, 2)}</div>
      </div>

      {/* 4. Drawdown */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <ShieldAlert size={15} className="text-rose-400" /> Drawdown máximo
        </div>
        <div className="text-lg font-bold font-mono text-rose-400">{formatPercent(results.max_drawdown_pct, false)}</div>
        <div className="text-xs text-slate-500 mt-1">Calmar: {formatNumber(results.benchmark_analytics.calmar_ratio, 2, 2)}</div>
      </div>

      {/* 5. Alpha & Beta */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <Scale size={15} className="text-indigo-400" /> Alpha y Beta
        </div>
        <div className="text-lg font-bold font-mono text-white">
          <span className={results.benchmark_analytics.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {formatPercent(results.benchmark_analytics.alpha)}
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Beta (β): <span className="text-slate-200 font-semibold">{formatNumber(results.benchmark_analytics.beta, 2, 2)}</span>
        </div>
      </div>

      {/* 6. Cost Drag (Expandable Popover) */}
      <div 
        onClick={() => setShowFrictionPopover(!showFrictionPopover)}
        className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer relative group transition"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
          <span className="flex items-center gap-1.5">
            <Receipt size={15} className="text-amber-400" /> Impacto de costes
          </span>
          <span className="text-slate-500 group-hover:text-slate-300">
            {showFrictionPopover ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </div>
        <div className="text-lg font-bold font-mono text-amber-400">
          {formatCurrency(-totalFrictions)}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Impacto: <span className="text-rose-400 font-semibold">{formatPercent(-capitalDragPct, false)}</span>
        </div>

        {/* Popover */}
        {showFrictionPopover && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="absolute top-full right-0 mt-2 w-52 bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-2xl z-40 text-xs"
          >
            <div className="text-slate-300 font-semibold mb-2 pb-1 border-b border-slate-800">
              Composición de costes
            </div>
            <div className="flex justify-between py-1 text-slate-400">
              <span>Comisiones:</span>
              <span className="font-mono text-slate-200">{formatCurrency(fees)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-400">
              <span>Slippage:</span>
              <span className="font-mono text-slate-200">{formatCurrency(slippage)}</span>
            </div>
            <div className="flex justify-between py-1 pt-1.5 border-t border-slate-800 text-slate-200 font-bold">
              <span>Coste total:</span>
              <span className="font-mono text-amber-400">{formatCurrency(totalFrictions)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});