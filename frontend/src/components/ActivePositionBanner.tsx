// src/components/ActivePositionBanner.tsx
import { AlertCircle } from 'lucide-react';
import { memo } from 'react';
import type { ActivePosition } from '../types';
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '../utils/formatters';

interface ActivePositionBannerProps {
  position: ActivePosition;
}

export const ActivePositionBanner = memo(({ position }: ActivePositionBannerProps) => {
  const slDistPct = position.stop_loss
    ? ((position.stop_loss - position.current_price) / position.current_price) * 100
    : null;
  const tpDistPct = position.take_profit
    ? ((position.take_profit - position.current_price) / position.current_price) * 100
    : null;

  return (
    <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
          <AlertCircle size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Posición activa: {position.symbol}
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
              LARGO
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Entrada el {formatDateTime(position.entry_time)} a {formatCurrency(position.entry_price)} | Actual: {formatCurrency(position.current_price)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 font-mono text-xs">
        <div>
          <span className="text-slate-500 block font-sans">Unidades</span>
          <span className="text-white font-bold">{formatNumber(position.quantity, 0, 8)}</span>
        </div>

        <div>
          <span className="text-slate-500 block font-sans">P&L no realizado</span>
          <span className={`font-bold ${position.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(position.unrealized_pnl)} ({formatPercent(position.unrealized_pnl_pct)})
          </span>
        </div>

        {position.stop_loss && (
          <div className="bg-slate-950/80 px-2.5 py-1 rounded border border-rose-900/60">
            <span className="text-[10px] text-rose-400 block font-sans font-semibold">Stop Loss</span>
            <span className="text-white font-bold">{formatCurrency(position.stop_loss)}</span>
            <span className="text-[10px] text-rose-400 ml-1">({formatPercent(slDistPct, false, 1)})</span>
          </div>
        )}

        {position.take_profit && (
          <div className="bg-slate-950/80 px-2.5 py-1 rounded border border-emerald-900/60">
            <span className="text-[10px] text-emerald-400 block font-sans font-semibold">Take Profit</span>
            <span className="text-white font-bold">{formatCurrency(position.take_profit)}</span>
            <span className="text-[10px] text-emerald-400 ml-1">({formatPercent(tpDistPct, true, 1)})</span>
          </div>
        )}
      </div>
    </div>
  );
});