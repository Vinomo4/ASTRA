// src/components/SynchronizedInspector.tsx
import React, { memo } from 'react';
import type { UnifiedDataPoint } from '../types';
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '../utils/formatters';

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
      <div className="flex justify-end mb-4">
        <div className="text-xs font-mono bg-slate-950 px-3 py-1 rounded-md border border-slate-800 text-indigo-200">
          <span ref={badgeRef} className="text-slate-500 mr-1.5">ÚLTIMA VELA</span>
          Fecha: <span ref={dateRef} className="font-bold text-white">{initialSnapshot ? formatDateTime(initialSnapshot.time) : '—'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Patrimonio de la cartera</span>
          <p ref={equityRef} className="text-base font-bold text-white">
            {formatCurrency(initialSnapshot?.equity ?? 0)}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Reserva de efectivo</span>
          <p ref={cashRef} className="text-base font-bold text-slate-300">
            {formatCurrency(initialSnapshot?.cash ?? 0)}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Unidades activas</span>
          <p ref={unitsRef} className="text-base font-bold text-slate-200">
            {formatNumber(initialSnapshot?.position_quantity ?? 0, 0, 8)}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Precio medio de entrada</span>
          <p ref={avgPriceRef} className="text-base font-bold text-slate-200">
            {initialSnapshot && initialSnapshot.position_avg_price > 0 ? formatCurrency(initialSnapshot.position_avg_price) : '—'}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">P&L no realizado</span>
          <p ref={pnlRef} className={`text-base font-bold ${initialSnapshot && initialSnapshot.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(initialSnapshot?.unrealized_pnl ?? 0)}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block font-sans">Drawdown actual</span>
          <p ref={ddRef} className={`text-base font-bold ${initialSnapshot && initialSnapshot.drawdown_pct < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {formatPercent(initialSnapshot?.drawdown_pct ?? 0, false)}
          </p>
        </div>
      </div>
    </div>
  );
});