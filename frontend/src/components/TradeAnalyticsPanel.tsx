// src/components/TradeAnalyticsPanel.tsx
import { ChevronDown, ChevronUp, Gauge, SlidersHorizontal } from 'lucide-react';
import { memo, useState } from 'react';
import type { TradeAnalytics, TradeItem } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface TradeAnalyticsPanelProps {
  analytics: TradeAnalytics;
  trades?: TradeItem[];
}

export const TradeAnalyticsPanel = memo(({ analytics, trades = [] }: TradeAnalyticsPanelProps) => {
  const [showDeepDive, setShowDeepDive] = useState(false);

  // Microstructure friction aggregates computed on-demand
  const totalGrossPnL = trades.reduce((acc, t) => acc + (t.gross_pnl ?? t.pnl), 0);
  const totalNetPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
  const totalCost = trades.reduce((acc, t) => acc + (t.fees_paid ?? t.commission_paid ?? 0) + (t.slippage_cost ?? 0), 0);
  const frictionGrossRatio = totalGrossPnL > 0 ? (totalCost / totalGrossPnL) * 100 : 0;
  const avgFrictionPerTrade = trades.length > 0 ? totalCost / trades.length : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl mb-8">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Gauge size={16} className="text-indigo-400" /> Distribución de operaciones y expectativa de rendimiento
        </div>

        <button
          type="button"
          onClick={() => setShowDeepDive(!showDeepDive)}
          className="text-xs font-semibold text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition"
        >
          <SlidersHorizontal size={13} /> {showDeepDive ? 'Ocultar desglose de costes' : 'Analizar el impacto de las fricciones'}
          {showDeepDive ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Primary 6-Metric Scaffolding */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <span className="text-[11px] text-slate-500 block font-sans">Tasa de acierto</span>
          <p className={`text-base font-bold ${analytics.win_rate_pct >= 50 ? 'text-emerald-400' : 'text-slate-200'}`}>
            {formatPercent(analytics.win_rate_pct, false, 1)}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <span className="text-[11px] text-slate-500 block font-sans">Factor de beneficio</span>
          <p className={`text-base font-bold ${analytics.profit_factor >= 1.5 ? 'text-emerald-400' : analytics.profit_factor >= 1.0 ? 'text-slate-200' : 'text-rose-400'}`}>
            {formatNumber(analytics.profit_factor, 2, 2)}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <span className="text-[11px] text-slate-500 block font-sans">Ratio beneficio/riesgo</span>
          <p className="text-base font-bold text-slate-200">
            {formatNumber(analytics.payoff_ratio, 2, 2)} : 1
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <span className="text-[11px] text-slate-500 block font-sans">Expectativa / operación</span>
          <p className={`text-base font-bold ${analytics.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(analytics.expectancy)}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <span className="text-[11px] text-slate-500 block font-sans">Duración media</span>
          <p className="text-base font-bold text-slate-200">
            {formatNumber(analytics.avg_trade_duration_days, 1, 1)} días
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <span className="text-[11px] text-slate-500 block font-sans">Rachas máximas (G/P)</span>
          <p className="text-base font-bold text-slate-200">
            <span className="text-emerald-400">{formatNumber(analytics.max_consecutive_wins, 0, 0)}G</span> / <span className="text-rose-400">{formatNumber(analytics.max_consecutive_losses, 0, 0)}P</span>
          </p>
        </div>
      </div>

      {/* Progressive Deep Dive Sub-Panel */}
      {showDeepDive && (
        <div className="mt-4 pt-4 border-t border-slate-800/60">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[11px] text-slate-500 block font-sans">P&L bruto acumulado</span>
              <p className={`text-sm font-bold ${totalGrossPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(totalGrossPnL)}
              </p>
            </div>

            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[11px] text-slate-500 block font-sans">P&L neto acumulado</span>
              <p className={`text-sm font-bold ${totalNetPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(totalNetPnL)}
              </p>
            </div>

            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[11px] text-slate-500 block font-sans">Coste medio / operación</span>
              <p className="text-sm font-bold text-amber-400">
                {formatCurrency(-avgFrictionPerTrade)}
              </p>
            </div>

            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[11px] text-slate-500 block font-sans">Erosión del Alpha bruto</span>
              <p className="text-sm font-bold text-rose-400">
                {formatPercent(frictionGrossRatio, false, 1)} de los beneficios
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});