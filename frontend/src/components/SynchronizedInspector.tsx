// src/components/SynchronizedInspector.tsx
import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import type { UnifiedDataPoint } from '../types/backtest';

export interface SynchronizedInspectorProps {
  initialSnapshot: UnifiedDataPoint | null;
  badgeRef: React.RefObject<HTMLSpanElement | null>;
  dateRef: React.RefObject<HTMLSpanElement | null>;
  equityRef: React.RefObject<HTMLParagraphElement | null>;
  cashRef: React.RefObject<HTMLParagraphElement | null>;
  unitsRef: React.RefObject<HTMLParagraphElement | null>;
  avgPriceRef: React.RefObject<HTMLParagraphElement | null>;
  pnlRef: React.RefObject<HTMLParagraphElement | null>;
  ddRef: React.RefObject<HTMLParagraphElement | null>;
}

export const SynchronizedInspector = memo(({
  initialSnapshot,
  badgeRef,
  dateRef,
  equityRef,
  cashRef,
  unitsRef,
  avgPriceRef,
  pnlRef,
  ddRef,
}: SynchronizedInspectorProps) => {
  return (
    <div className="bg-slate-900 border border-indigo-900/50 rounded-xl p-6 mb-8 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="text-indigo-400" size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
            Synchronized State Inspector
          </h2>
        </div>
        <div className="text-xs font-mono bg-slate-950 px-3 py-1 rounded-md border border-slate-800 text-indigo-200">
          <span ref={badgeRef} className="text-slate-500 mr-1.5">LATEST BAR</span>
          Date: <span ref={dateRef} className="font-bold text-white">{initialSnapshot?.time ?? '—'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Portfolio Equity</span>
          <p ref={equityRef} className="text-base font-bold text-white">
            ${initialSnapshot ? initialSnapshot.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Cash Reserve</span>
          <p ref={cashRef} className="text-base font-bold text-slate-300">
            ${initialSnapshot ? initialSnapshot.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Active Units</span>
          <p ref={unitsRef} className="text-base font-bold text-slate-200">
            {initialSnapshot?.position_quantity ?? 0}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Avg Entry Price</span>
          <p ref={avgPriceRef} className="text-base font-bold text-slate-200">
            {initialSnapshot && initialSnapshot.position_avg_price > 0 ? `$${initialSnapshot.position_avg_price.toFixed(2)}` : '—'}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Unrealized P&L</span>
          <p ref={pnlRef} className={`text-base font-bold ${initialSnapshot && initialSnapshot.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${initialSnapshot?.unrealized_pnl.toFixed(2) ?? '0.00'}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Current Drawdown</span>
          <p ref={ddRef} className={`text-base font-bold ${initialSnapshot && initialSnapshot.drawdown_pct < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {initialSnapshot?.drawdown_pct.toFixed(2) ?? '0.00'}%
          </p>
        </div>
      </div>
    </div>
  );
});