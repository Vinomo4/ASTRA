// frontend/src/components/MonteCarloPanel.tsx
import { AlertTriangle, Dna, ShieldAlert } from 'lucide-react';
import { memo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonteCarloAnalytics } from '../types';
import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface MonteCarloPanelProps {
  monteCarlo?: MonteCarloAnalytics | null;
}

export const MonteCarloPanel = memo(({ monteCarlo }: MonteCarloPanelProps) => {
  if (!monteCarlo || monteCarlo.trade_count < 3) {
    return null;
  }

  // Stacked area bands calculation
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Dna size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Resiliencia de Monte Carlo y simulación bootstrap
              </h2>
              <span className="bg-slate-800 text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-700">
                B = {formatNumber(monteCarlo.num_simulations, 0, 0)} trayectorias
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Límites probabilísticos de drawdown, riesgo de ruina y distribuciones de riesgo de cola
            </p>
          </div>
        </div>
      </div>

      {/* Direct Content Body */}
      <div className="p-5">
        {/* Risk Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 font-mono text-xs">
          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-500 font-sans text-[11px] mb-1">
              <span>Riesgo de ruina ({formatNumber(-monteCarlo.ruin_threshold_pct, 0, 2)} %)</span>
              <AlertTriangle size={13} className={monteCarlo.risk_of_ruin_pct > 5 ? 'text-rose-400' : 'text-emerald-400'} />
            </div>
            <p className={`text-lg font-bold ${monteCarlo.risk_of_ruin_pct > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatPercent(monteCarlo.risk_of_ruin_pct, false)}
            </p>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">P(Drawdown ≥ {formatNumber(monteCarlo.ruin_threshold_pct, 0, 2)} %)</div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-500 font-sans text-[11px] mb-1">
              <span>Drawdown máximo (95 %)</span>
              <ShieldAlert size={13} className="text-rose-400" />
            </div>
            <p className="text-lg font-bold text-rose-400">
              {formatPercent(-monteCarlo.p95_max_dd_pct, false)}
            </p>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">Drawdown 99 %: {formatPercent(-monteCarlo.p99_max_dd_pct, false)}</div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-500 block font-sans mb-1">Valor en riesgo (VaR 95 %)</span>
            <p className="text-lg font-bold text-slate-200">
              {formatPercent(monteCarlo.var_95_pct, false)}
            </p>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">VaR 99 %: {formatPercent(monteCarlo.var_99_pct, false)}</div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-500 block font-sans mb-1">Riesgo de cola (CVaR 95 %)</span>
            <p className="text-lg font-bold text-rose-400/90">
              {formatPercent(monteCarlo.cvar_95_pct, false)}
            </p>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">Pérdida esperada</div>
          </div>
        </div>

        {/* Fan Chart View */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 text-xs">
            <span className="font-semibold text-slate-300">Bandas percentiles de la trayectoria del patrimonio</span>
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-0.5 bg-emerald-400 rounded"></span> Trayectoria mediana (P50)
              </span>
              <span className="flex items-center gap-1 text-indigo-300">
                <span className="w-2.5 h-2.5 bg-indigo-500/30 border border-indigo-400/50 rounded-sm"></span> Banda P25–P75
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 bg-slate-700/20 border border-slate-600/30 rounded-sm"></span> Envolvente P5–P95
              </span>
            </div>
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="step"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Número de operación (secuencia)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => formatCompactCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                  labelFormatter={(label) => `Operación ${formatNumber(Number(label), 0, 0)}`}
                  formatter={(val, name, item) => {
                    const key = String(name);
                    const source = item?.payload as (typeof chartData)[number] | undefined;
                    const rawValues: Record<string, number | undefined> = {
                      p5: source?.raw_p5,
                      p25_diff: source?.raw_p25,
                      p75_diff: source?.raw_p75,
                      p95_diff: source?.raw_p95,
                      median: source?.median,
                    };
                    const displayValue = rawValues[key] ?? (typeof val === 'number' ? val : undefined);
                    const formattedVal = displayValue === undefined ? String(val) : formatCurrency(displayValue);
                    const labelMap: Record<string, string> = {
                      p5: 'Percentil 5 (P5)',
                      p25_diff: 'Percentil 25 (P25)',
                      p75_diff: 'Percentil 75 (P75)',
                      p95_diff: 'Percentil 95 (P95)',
                      median: 'Trayectoria mediana (P50)',
                    };
                    return [formattedVal, labelMap[key] || 'Valor'];
                  }}
                />

                <Area type="monotone" dataKey="p5" stackId="1" stroke="none" fill="transparent" />
                <Area type="monotone" dataKey="p25_diff" stackId="1" stroke="none" fill="#475569" fillOpacity={0.15} />
                <Area type="monotone" dataKey="p75_diff" stackId="1" stroke="none" fill="#6366f1" fillOpacity={0.25} />
                <Area type="monotone" dataKey="p95_diff" stackId="1" stroke="none" fill="#475569" fillOpacity={0.15} />
                <Line type="monotone" dataKey="median" stroke="#10b981" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
});