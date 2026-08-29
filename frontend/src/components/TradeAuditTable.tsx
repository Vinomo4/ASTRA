// src/components/TradeAuditTable.tsx
import { memo } from 'react';
import type { TradeItem } from '../types';
import { formatAdaptiveDate, formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

const getExitBadge = (reason: string) => {
  switch (reason) {
    case 'TAKE_PROFIT':
      return <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold px-2 py-0.5 rounded text-[10px]">TAKE PROFIT</span>;
    case 'STOP_LOSS':
      return <span className="bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold px-2 py-0.5 rounded text-[10px]">STOP LOSS</span>;
    default:
      return <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold px-2 py-0.5 rounded text-[10px]">SALIDA POR SEÑAL</span>;
  }
};

export const TradeAuditTable = memo(({ trades }: { trades: TradeItem[] }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
      <h2 className="text-base font-semibold text-white">Registro de auditoría de operaciones cerradas</h2>
      <span className="text-xs text-slate-400">Total cerradas: {formatNumber(trades.length, 0, 0)} posiciones</span>
    </div>
    <div className="max-h-[32rem] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-800 text-slate-400 text-xs uppercase font-semibold shadow-sm">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Símbolo</th>
            <th className="p-3">Motivo de salida</th>
            <th className="p-3">Fecha de entrada / salida</th>
            <th className="p-3">Precios de ejecución (efectivos)</th>
            <th className="p-3">Unidades</th>
            <th className="p-3">P&L bruto</th>
            <th className="p-3">Fricciones (comisiones + slippage)</th>
            <th className="p-3">P&L neto (USD)</th>
            <th className="p-3">Rentabilidad neta (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 font-mono text-xs">
          {trades.length === 0 ? (
            <tr>
              <td colSpan={10} className="p-4 text-center text-slate-500 font-sans">
                No se cerraron operaciones en este intervalo de fechas.
              </td>
            </tr>
          ) : (
            trades.map((t) => {
              const fees = t.fees_paid ?? t.commission_paid ?? 0;
              const slip = t.slippage_cost ?? 0;
              const gross = t.gross_pnl ?? t.pnl;
              const effEntry = t.effective_entry_price ?? t.entry_price;
              const effExit = t.effective_exit_price ?? t.exit_price;

              return (
                <tr key={t.trade_id} className="hover:bg-slate-800/30">
                  <td className="p-3 text-slate-400">{t.trade_id}</td>
                  <td className="p-3 font-semibold text-white font-sans">{t.symbol}</td>
                  <td className="p-3 font-sans">{getExitBadge(t.exit_reason)}</td>
                  <td className="p-3 text-slate-300">
                    <div>{formatAdaptiveDate(t.entry_time, false)}</div>
                    <div className="text-slate-500 text-[11px]">{formatAdaptiveDate(t.exit_time, false)}</div>
                  </td>
                  <td className="p-3 text-slate-300">
                    <div>Entrada: {formatCurrency(effEntry)}</div>
                    <div className="text-slate-400 text-[11px]">Salida: {formatCurrency(effExit)}</div>
                  </td>
                  <td className="p-3 text-slate-300">{formatNumber(t.quantity, 0, 8)}</td>
                  <td className={`p-3 ${gross >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(gross)}
                  </td>
                  <td className="p-3 text-slate-400">
                    <div className="text-rose-400/90">{formatCurrency(-(fees + slip))}</div>
                    <div className="text-[10px] text-slate-500">Comisiones: {formatCurrency(fees)}</div>
                  </td>
                  <td className={`p-3 font-semibold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(t.pnl)}
                  </td>
                  <td className={`p-3 font-semibold ${t.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPercent(t.pnl_pct)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
));