// src/components/MonteCarloPanel.tsx
import { memo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Dna, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { MonteCarloAnalytics } from '../types/backtest';

interface MonteCarloPanelProps {
  monteCarlo?: MonteCarloAnalytics | null;
}

export const MonteCarloPanel = memo(({ monteCarlo }: MonteCarloPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!monteCarlo || monteCarlo.trade_count < 3) {
    return null;
  }

  // Pre-process stacked area bands:
  // Band 1: p5 (base)
  // Band 2: p25 - p5 (outer lower interquartile)
  // Band 3: p75 - p25 (interquartile 50% band)
  // Band 4: p95 - p75 (outer upper band)
  const chartData = monteCarlo.confidence_bands.map((b) => ({
    step: b.trade_step,
    p5: b.p5,
    p25_diff: Math.max(0, b.p25 - b.p5),
    p75_diff: Math.max(0, b.p75 - b.p25),
    p95_diff: Math.max(0, b.p95 - b.p75),
    median: b.p50,
    raw_p5: b.p5,
    raw_p25: b.p25,
    raw_p75: b.p75,
    raw_p95: b.p95,
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl mb-8 overflow-hidden transition">
      {/* Header Bar with Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Dna size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Monte Carlo Resilience & Bootstrap Simulation
              </h2>
              <span className="bg-slate-800 text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-700">
                B = {monteCarlo.num_simulations.toLocaleString()} paths
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Probabilistic drawdown bounds, risk of ruin, and tail risk distributions
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-xs font-semibold text-slate-400 flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800"
        >
          {isOpen ? 'Collapse Risk Model' : 'Inspect Risk Bounds'}
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-5 pt-0 border-t border-slate-800/60">
          {/* Key Risk Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 font-mono text-xs">
            {/* Risk of Ruin */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-slate-500 font-sans text-[11px] mb-1">
                <span>Risk of Ruin (-{monteCarlo.ruin_threshold_pct}%)</span>
                <AlertTriangle size={13} className={monteCarlo.risk_of_ruin_pct > 5 ? 'text-rose-400' : 'text-emerald-400'} />
              </div>
              <p className={`text-base font-bold ${monteCarlo.risk_of_ruin_pct > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {monteCarlo.risk_of_ruin_pct.toFixed(2)}%
              </p>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">P(Drawdown ≥ {monteCarlo.ruin_threshold_pct}%)</div>
            </div>

            {/* 95th Percentile Max DD */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-slate-500 font-sans text-[11px] mb-1">
                <span>95% Max Drawdown</span>
                <ShieldAlert size={13} className="text-rose-400" />
              </div>
              <p className="text-base font-bold text-rose-400">
                -{monteCarlo.p95_max_dd_pct.toFixed(2)}%
              </p>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">99% DD: -{monteCarlo.p99_max_dd_pct.toFixed(2)}%</div>
            </div>

            {/* VaR 95% */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-500 block font-sans mb-1">Value at Risk (VaR 95%)</span>
              <p className="text-base font-bold text-slate-200">
                {monteCarlo.var_95_pct.toFixed(2)}%
              </p>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">VaR 99%: {monteCarlo.var_99_pct.toFixed(2)}%</div>
            </div>

            {/* CVaR 95% */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-500 block font-sans mb-1">Tail Risk (CVaR 95%)</span>
              <p className="text-base font-bold text-rose-400/90">
                {monteCarlo.cvar_95_pct.toFixed(2)}%
              </p>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">Expected Shortfall</div>
            </div>
          </div>

          {/* Fan Chart View */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-300">Equity Trajectory Percentile Envelopes</span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-400 rounded"></span> Median Path (50th)
                </span>
                <span className="flex items-center gap-1 text-indigo-300">
                  <span className="w-2.5 h-2.5 bg-indigo-500/30 border border-indigo-400/50 rounded-sm"></span> 25th–75th Band
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 bg-slate-700/20 border border-slate-600/30 rounded-sm"></span> 5th–95th Envelope
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="step"
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Trade Number (Sequence)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11 }}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                    labelFormatter={(step) => `Trade Step ${step}`}
                    formatter={(_val: any, name: string, item: any) => {
                      if (name === 'median') return [`$${item.payload.median.toLocaleString()}`, 'Median Equity'];
                      if (name === 'p95_diff') return [`$${item.payload.raw_p95.toLocaleString()}`, '95th Percentile'];
                      if (name === 'p75_diff') return [`$${item.payload.raw_p75.toLocaleString()}`, '75th Percentile'];
                      if (name === 'p25_diff') return [`$${item.payload.raw_p25.toLocaleString()}`, '25th Percentile'];
                      if (name === 'p5') return [`$${item.payload.raw_p5.toLocaleString()}`, '5th Percentile'];
                      return null;
                    }}
                  />

                  {/* Outer 5th - 95th Percentile Band */}
                  <Area type="monotone" dataKey="p5" stackId="1" stroke="none" fill="transparent" />
                  <Area type="monotone" dataKey="p25_diff" stackId="1" stroke="none" fill="#475569" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="p75_diff" stackId="1" stroke="none" fill="#6366f1" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="p95_diff" stackId="1" stroke="none" fill="#475569" fillOpacity={0.15} />

                  {/* Median Line (50th percentile) */}
                  <Line type="monotone" dataKey="median" stroke="#10b981" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});