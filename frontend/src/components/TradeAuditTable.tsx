// src/components/TradeAuditTable.tsx
import { memo } from 'react';
import type { TradeItem } from '../types/backtest';

const getExitBadge = (reason: string) => {
  switch (reason) {
    case 'TAKE_PROFIT':
      return <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold px-2 py-0.5 rounded text-[10px]">TAKE PROFIT</span>;
    case 'STOP_LOSS':
      return <span className="bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold px-2 py-0.5 rounded text-[10px]">STOP LOSS</span>;
    default:
      return <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold px-2 py-0.5 rounded text-[10px]">SIGNAL EXIT</span>;
  }
};

export const TradeAuditTable = memo(({ trades }: { trades: TradeItem[] }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
      <h2 className="text-base font-semibold text-white">Closed Trades Audit Log</h2>
      <span className="text-xs text-slate-400">Total Closed: {trades.length} positions</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-semibold">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Symbol</th>
            <th className="p-3">Side</th>
            <th className="p-3">Exit Trigger</th>
            <th className="p-3">Entry Date</th>
            <th className="p-3">Exit Date</th>
            <th className="p-3">Entry ($)</th>
            <th className="p-3">Exit ($)</th>
            <th className="p-3">Units</th>
            <th className="p-3">P&L ($)</th>
            <th className="p-3">Return (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 font-mono text-xs">
          {trades.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-4 text-center text-slate-500 font-sans">
                No closed trades completed in this date range.
              </td>
            </tr>
          ) : (
            trades.map((t) => (
              <tr key={t.trade_id} className="hover:bg-slate-800/30">
                <td className="p-3 text-slate-400">{t.trade_id}</td>
                <td className="p-3 font-semibold text-white font-sans">{t.symbol}</td>
                <td className="p-3">
                  <span className="bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded text-[11px]">
                    {t.side}
                  </span>
                </td>
                <td className="p-3 font-sans">{getExitBadge(t.exit_reason)}</td>
                <td className="p-3 text-slate-300">{t.entry_time}</td>
                <td className="p-3 text-slate-300">{t.exit_time}</td>
                <td className="p-3 text-slate-300">${t.entry_price.toFixed(2)}</td>
                <td className="p-3 text-slate-300">${t.exit_price.toFixed(2)}</td>
                <td className="p-3 text-slate-300">{t.quantity}</td>
                <td className={`p-3 font-semibold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${t.pnl.toFixed(2)}
                </td>
                <td className={`p-3 font-semibold ${t.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
));