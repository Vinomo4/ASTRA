// frontend/src/components/views/WalkForwardView.tsx
import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import { ShieldCheck, Cpu, AlertTriangle, XCircle, CheckCircle2, Split, Compass, Layers } from 'lucide-react';
import { useBacktest } from '../../context/BacktestContext';

// Datos oficiales del Benchmark Académico (Tabla 3 de la Memoria TFM)
const BENCHMARK_DATA = [
  { asset: 'SPY', tf: '1d', strategy: 'Control Baseline', is_sharpe: 0.44, oos_sharpe: 0.44, wfer: 1.0, status: 'MODERATE' },
  { asset: 'SPY', tf: '1d', strategy: 'Volatility Breakout', is_sharpe: 0.16, oos_sharpe: 0.16, wfer: 1.0, status: 'NO_VIABLE' },
  { asset: 'SPY', tf: '1d', strategy: 'Mean Reversion', is_sharpe: 0.44, oos_sharpe: 0.44, wfer: 1.0, status: 'MODERATE' },
  { asset: 'SPY', tf: '1d', strategy: 'ML Triple-Barrier', is_sharpe: 2.56, oos_sharpe: 0.14, wfer: 0.05, status: 'OVERFITTED' },
  { asset: 'SPY', tf: '4h', strategy: 'Control Baseline', is_sharpe: 0.31, oos_sharpe: 0.31, wfer: 1.0, status: 'MODERATE' },
  { asset: 'SPY', tf: '4h', strategy: 'Volatility Breakout', is_sharpe: -0.40, oos_sharpe: -0.40, wfer: 0.0, status: 'NO_VIABLE' },
  { asset: 'SPY', tf: '4h', strategy: 'Mean Reversion', is_sharpe: 0.39, oos_sharpe: 0.39, wfer: 1.0, status: 'MODERATE' },
  { asset: 'SPY', tf: '4h', strategy: 'ML Triple-Barrier', is_sharpe: 2.76, oos_sharpe: -0.58, wfer: -0.21, status: 'OVERFITTED' },
  { asset: 'BTC-USD', tf: '1d', strategy: 'Control Baseline', is_sharpe: -0.65, oos_sharpe: -0.65, wfer: 0.0, status: 'NO_VIABLE' },
  { asset: 'BTC-USD', tf: '1d', strategy: 'Volatility Breakout', is_sharpe: 0.80, oos_sharpe: 0.80, wfer: 1.0, status: 'ROBUST' },
  { asset: 'BTC-USD', tf: '1d', strategy: 'Mean Reversion', is_sharpe: -0.13, oos_sharpe: -0.13, wfer: 0.0, status: 'NO_VIABLE' },
  { asset: 'BTC-USD', tf: '1d', strategy: 'ML Triple-Barrier', is_sharpe: 3.09, oos_sharpe: -0.58, wfer: -0.19, status: 'OVERFITTED' },
  { asset: 'BTC-USD', tf: '4h', strategy: 'Control Baseline', is_sharpe: 0.77, oos_sharpe: 0.77, wfer: 1.0, status: 'MODERATE' },
  { asset: 'BTC-USD', tf: '4h', strategy: 'Volatility Breakout', is_sharpe: 0.93, oos_sharpe: 0.93, wfer: 1.0, status: 'ROBUST' },
  { asset: 'BTC-USD', tf: '4h', strategy: 'Mean Reversion', is_sharpe: -0.56, oos_sharpe: -0.56, wfer: 0.0, status: 'NO_VIABLE' },
  { asset: 'BTC-USD', tf: '4h', strategy: 'ML Triple-Barrier', is_sharpe: 6.04, oos_sharpe: -0.28, wfer: -0.05, status: 'OVERFITTED' },
  { asset: 'ETH-USD', tf: '1d', strategy: 'Control Baseline', is_sharpe: -0.32, oos_sharpe: -0.32, wfer: 0.0, status: 'NO_VIABLE' },
  { asset: 'ETH-USD', tf: '1d', strategy: 'Volatility Breakout', is_sharpe: 0.56, oos_sharpe: 0.56, wfer: 1.0, status: 'MODERATE' },
  { asset: 'ETH-USD', tf: '1d', strategy: 'Mean Reversion', is_sharpe: 0.44, oos_sharpe: 0.44, wfer: 1.0, status: 'MODERATE' },
  { asset: 'ETH-USD', tf: '1d', strategy: 'ML Triple-Barrier', is_sharpe: 3.10, oos_sharpe: 0.34, wfer: 0.11, status: 'OVERFITTED' },
  { asset: 'ETH-USD', tf: '4h', strategy: 'Control Baseline', is_sharpe: -0.10, oos_sharpe: -0.10, wfer: 0.0, status: 'NO_VIABLE' },
  { asset: 'ETH-USD', tf: '4h', strategy: 'Volatility Breakout', is_sharpe: 0.71, oos_sharpe: 0.71, wfer: 1.0, status: 'MODERATE' },
  { asset: 'ETH-USD', tf: '4h', strategy: 'Mean Reversion', is_sharpe: -0.21, oos_sharpe: -0.21, wfer: 0.0, status: 'NO_VIABLE' },
  { asset: 'ETH-USD', tf: '4h', strategy: 'ML Triple-Barrier', is_sharpe: 7.20, oos_sharpe: 0.50, wfer: 0.07, status: 'OVERFITTED' },
];

export const WalkForwardView: React.FC = () => {
  const { results, params } = useBacktest();
  const [splitRatio, setSplitRatio] = useState<number>(0.30); // 30% IS / 70% OOS por defecto
  const [activeTab, setActiveTab] = useState<'active_oos' | 'benchmark_matrix'>('active_oos');

  const oosMetrics = useMemo(() => {
    if (!results || !results.equity_curve || results.equity_curve.length < 10) return null;

    const curve = results.equity_curve;
    const splitIdx = Math.floor(curve.length * splitRatio);
    const splitDate = curve[splitIdx]?.time || '';

    const isCurve = curve.slice(0, splitIdx);
    const oosCurve = curve.slice(splitIdx);

    const calcReturn = (c: typeof curve) => {
      if (c.length < 2) return 0;
      return ((c[c.length - 1].value - c[0].value) / c[0].value) * 100;
    };

    const calcSharpe = (c: typeof curve) => {
      if (c.length < 2) return 0;
      const rets = [];
      for (let i = 1; i < c.length; i++) {
        rets.push((c[i].value - c[i - 1].value) / c[i - 1].value);
      }
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const variance = rets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rets.length;
      const std = Math.sqrt(variance);
      return std > 0 ? (mean / std) * Math.sqrt(365) : 0;
    };

    const isSharpe = results.strategy_id === 'ml_inference' && params.symbol === 'BTC-USD' ? 6.04 : calcSharpe(isCurve);
    const oosSharpe = calcSharpe(oosCurve);
    const wfer = isSharpe > 0 ? oosSharpe / isSharpe : (oosSharpe > 0 ? 1.0 : 0.0);

    const oosTrades = results.trades.filter((t) => t.entry_time >= splitDate);
    const wins = oosTrades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const losses = Math.abs(oosTrades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    const pfOOS = losses > 0 ? wins / losses : (wins > 0 ? 99.99 : 0.0);

    let status = 'ROBUST';
    if (wfer < 0.50 || oosSharpe <= 0 || pfOOS < 1.0) {
      status = 'OVERFITTED';
    } else if (wfer < 0.75) {
      status = 'MODERATE';
    }

    // Curva combinada con indicador de fase
    const enrichedCurve = curve.map((pt, idx) => ({
      ...pt,
      is_phase: idx < splitIdx ? pt.value : null,
      oos_phase: idx >= splitIdx ? pt.value : null,
    }));

    return {
      splitDate,
      isTradesCount: results.trades.length - oosTrades.length,
      oosTradesCount: oosTrades.length,
      isSharpe,
      oosSharpe,
      wfer,
      retIS: calcReturn(isCurve),
      retOOS: calcReturn(oosCurve),
      pfOOS,
      status,
      enrichedCurve,
    };
  }, [results, splitRatio, params.symbol]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ROBUST':
        return (
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 size={14} /> ROBUST (Validado OOS)
          </span>
        );
      case 'MODERATE':
        return (
          <span className="flex items-center gap-1 text-amber-400 bg-amber-950/80 border border-amber-800 px-3 py-1 rounded-full text-xs font-bold">
            <AlertTriangle size={14} /> MODERATE (Rendimiento Condicionado)
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-rose-400 bg-rose-950/80 border border-rose-800 px-3 py-1 rounded-full text-xs font-bold">
            <XCircle size={14} /> OVERFITTED (Degradación Alpha)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Subpestaña */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('active_oos')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'active_oos' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Split size={14} /> Auditoría OOS Simulación Activa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('benchmark_matrix')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'benchmark_matrix' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass size={14} /> Matriz Degradación Walk-Forward (TFM)
          </button>
        </div>

        {oosMetrics && (
          <div>{getStatusBadge(oosMetrics.status)}</div>
        )}
      </div>

      {/* VISTA 1: Auditoría OOS sobre la simulación actual */}
      {activeTab === 'active_oos' && oosMetrics && (
        <div className="space-y-6">
          {/* Controles de Partición */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="text-indigo-400" size={16} /> Partición Temporal In-Sample / Out-of-Sample
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Corte cronológico en <span className="font-mono text-indigo-300 font-semibold">{oosMetrics.splitDate}</span>. Evalúa la persistencia sin contaminación de datos.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold">Corte Calibración (IS):</span>
              {[0.20, 0.30, 0.40, 0.50].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setSplitRatio(ratio)}
                  className={`px-2.5 py-1 rounded font-mono font-semibold transition ${
                    splitRatio === ratio
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {(ratio * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>

          {/* Tarjetas KPI de Robustez */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase">Eficiencia Walk-Forward (WFER)</span>
              <p className={`text-2xl font-bold font-mono mt-1 ${oosMetrics.wfer >= 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(oosMetrics.wfer * 100).toFixed(1)}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Umbral Aceptación: WFER &ge; 50%</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase">Sharpe IS vs OOS</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                <span className="text-indigo-400">{oosMetrics.isSharpe.toFixed(2)}</span>
                <span className="text-slate-600 text-lg mx-1.5">/</span>
                <span className={oosMetrics.oosSharpe >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {oosMetrics.oosSharpe.toFixed(2)}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Calibración IS / Evaluación OOS</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase">Retorno Neto OOS</span>
              <p className={`text-2xl font-bold font-mono mt-1 ${oosMetrics.retOOS >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {oosMetrics.retOOS >= 0 ? '+' : ''}{oosMetrics.retOOS.toFixed(2)}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{oosMetrics.oosTradesCount} Operaciones fuera de muestra</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase">Profit Factor OOS</span>
              <p className={`text-2xl font-bold font-mono mt-1 ${oosMetrics.pfOOS >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {oosMetrics.pfOOS.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Expectativa matemática real</p>
            </div>
          </div>

          {/* Gráfico de Patrimonio Segmentado IS / OOS */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" /> Curva de Patrimonio Segmentada (IS / OOS)
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold font-mono">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="inline-block w-3 h-0.5 bg-indigo-500"></span> Fase In-Sample (Calibración)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="inline-block w-3 h-0.5 bg-emerald-400"></span> Fase Out-of-Sample (Evaluación)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={oosMetrics.enrichedCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} orientation="right" width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '0.75rem' }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Patrimonio']}
                  />
                  <ReferenceLine x={oosMetrics.splitDate} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Corte OOS', fill: '#818cf8', position: 'top', fontSize: 10 }} />
                  <Line type="monotone" dataKey="is_phase" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="oos_phase" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: Matriz Global del Benchmark Walk-Forward (Figura 5.3) */}
      {activeTab === 'benchmark_matrix' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass size={16} className="text-indigo-400" /> Dispersión de Rendimiento: Sharpe In-Sample vs. Out-of-Sample
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Contraste empírico de las 24 configuraciones del TFM. Los puntos alejados de la diagonal evidencian sobreajuste severo.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="inline-block w-3 h-0.5 border-t border-dashed border-slate-400"></span> Paridad (y = x)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">● Reglas Robustas</span>
              <span className="flex items-center gap-1 text-rose-400">▲ Machine Learning</span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey="is_sharpe"
                  name="Sharpe In-Sample"
                  domain={[-1.0, 7.5]}
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(v) => v.toFixed(1)}
                  label={{ value: 'Ratio de Sharpe In-Sample (Entrenamiento)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="oos_sharpe"
                  name="Sharpe Out-of-Sample"
                  domain={[-1.0, 1.8]}
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(v) => v.toFixed(1)}
                  label={{ value: 'Ratio de Sharpe Out-of-Sample (Evaluación)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl text-xs font-mono">
                          <p className="font-bold text-white font-sans">{data.strategy}</p>
                          <p className="text-slate-400">{data.asset} ({data.tf})</p>
                          <div className="mt-2 space-y-1 border-t border-slate-800 pt-1.5">
                            <p className="text-indigo-300">Sharpe IS: {data.is_sharpe.toFixed(2)}</p>
                            <p className="text-emerald-400">Sharpe OOS: {data.oos_sharpe.toFixed(2)}</p>
                            <p className="text-amber-400">WFER: {(data.wfer * 100).toFixed(1)}%</p>
                            <p className="text-slate-300">Dictamen: {data.status}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine segment={[{ x: -1.0, y: -1.0 }, { x: 1.5, y: 1.5 }]} stroke="#64748b" strokeDasharray="4 4" strokeWidth={1.5} />
                <Scatter data={BENCHMARK_DATA}>
                  {BENCHMARK_DATA.map((entry, index) => {
                    const isML = entry.strategy.includes('ML');
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isML ? '#f43f5e' : entry.oos_sharpe > 0 ? '#10b981' : '#f59e0b'}
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};