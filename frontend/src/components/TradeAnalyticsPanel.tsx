// src/components/TradeAnalyticsPanel.tsx
import { memo } from 'react';
import { Gauge } from 'lucide-react';
import type { TradeAnalytics } from '../types/backtest';

interface TradeAnalyticsPanelProps {
  analytics: TradeAnalytics;
}

export const TradeAnalyticsPanel = memo(({ analytics }: TradeAnalyticsPanelProps) => (
  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl mb-8">
    <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">
      <Gauge size={16} className="text-indigo-400" /> Trade Distribution & Performance Expectancy
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
        <span className="text-[11px] text-slate-500 block font-sans">Win Rate</span>
        <p className={`text-base font-bold ${analytics.win_rate_pct >= 50 ? 'text-emerald-400' : 'text-slate-200'}`}>
          {analytics.win_rate_pct.toFixed(1)}%
        </p>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
        <span className="text-[11px] text-slate-500 block font-sans">Profit Factor</span>
        <p className={`text-base font-bold ${analytics.profit_factor >= 1.5 ? 'text-emerald-400' : analytics.profit_factor >= 1.0 ? 'text-slate-200' : 'text-rose-400'}`}>
          {analytics.profit_factor.toFixed(2)}
        </p>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
        <span className="text-[11px] text-slate-500 block font-sans">Payoff Ratio</span>
        <p className="text-base font-bold text-slate-200">
          {analytics.payoff_ratio.toFixed(2)} : 1
        </p>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
        <span className="text-[11px] text-slate-500 block font-sans">Expectancy / Trade</span>
        <p className={`text-base font-bold ${analytics.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          ${analytics.expectancy.toFixed(2)}
        </p>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
        <span className="text-[11px] text-slate-500 block font-sans">Avg Duration</span>
        <p className="text-base font-bold text-slate-200">
          {analytics.avg_trade_duration_days.toFixed(1)} days
        </p>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
        <span className="text-[11px] text-slate-500 block font-sans">Max Streaks (W/L)</span>
        <p className="text-base font-bold text-slate-200">
          <span className="text-emerald-400">{analytics.max_consecutive_wins}W</span> / <span className="text-rose-400">{analytics.max_consecutive_losses}L</span>
        </p>
      </div>
    </div>
  </div>
));