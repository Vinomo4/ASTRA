// src/components/ActivePositionBanner.tsx
import { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ActivePosition } from '../types/backtest';

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
            Active Position: {position.symbol}
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
              LONG
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Entered on {position.entry_time} at ${position.entry_price.toFixed(2)} | Current: ${position.current_price.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 font-mono text-xs">
        <div>
          <span className="text-slate-500 block font-sans">Units</span>
          <span className="text-white font-bold">{position.quantity}</span>
        </div>

        <div>
          <span className="text-slate-500 block font-sans">Unrealized P&L</span>
          <span className={`font-bold ${position.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${position.unrealized_pnl.toFixed(2)} ({position.unrealized_pnl_pct >= 0 ? '+' : ''}{position.unrealized_pnl_pct.toFixed(2)}%)
          </span>
        </div>

        {position.stop_loss && (
          <div className="bg-slate-950/80 px-2.5 py-1 rounded border border-rose-900/60">
            <span className="text-[10px] text-rose-400 block font-sans font-semibold">Stop Loss</span>
            <span className="text-white font-bold">${position.stop_loss.toFixed(2)}</span>
            <span className="text-[10px] text-rose-400 ml-1">({slDistPct?.toFixed(1)}%)</span>
          </div>
        )}

        {position.take_profit && (
          <div className="bg-slate-950/80 px-2.5 py-1 rounded border border-emerald-900/60">
            <span className="text-[10px] text-emerald-400 block font-sans font-semibold">Take Profit</span>
            <span className="text-white font-bold">${position.take_profit.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-400 ml-1">(+{tpDistPct?.toFixed(1)}%)</span>
          </div>
        )}
      </div>
    </div>
  );
});