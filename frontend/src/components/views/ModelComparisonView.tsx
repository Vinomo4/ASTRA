// frontend/src/components/views/ModelComparisonView.tsx
import axios from 'axios';
import { AlertCircle, GitCompare, Play, RefreshCw, TrendingUp, Trophy } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useBacktest } from '../../context/BacktestContext';
import type { ComparisonResponse } from '../../types';
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber, formatPercent } from '../../utils/formatters';

interface SelectedModelOption {
  type: 'base' | 'preset';
  id: string;
  name: string;
  displayName: string;
  strategy_id: string;
  params: Record<string, unknown>;
}

const STRATEGY_LABELS_BY_ID_ES: Record<string, string> = {
  trend_following_ema: 'Seguimiento de tendencia con EMA',
  regime_volatility_breakout: 'Ruptura de volatilidad filtrada por régimen',
  mean_reversion: 'Reversión a la media con Z-Score',
  ml_inference: 'Inferencia ML Triple-Barrier',
};

const STRATEGY_LABELS_BY_NAME_ES: Record<string, string> = {
  'Control Baseline': 'Referencia de control',
  'Control Baseline (Dual EMA)': 'Referencia de control (EMA doble)',
  'EMA Trend Following': 'Seguimiento de tendencia con EMA',
  'Volatility Breakout': 'Ruptura de volatilidad',
  'Adaptive Volatility Breakout': 'Ruptura de volatilidad adaptativa',
  'Regime-Filtered Volatility Breakout': 'Ruptura de volatilidad filtrada por régimen',
  'Mean Reversion': 'Reversión a la media',
  'Statistical Z-Score Mean Reversion': 'Reversión a la media con Z-Score',
  'ML Triple-Barrier': 'ML Triple-Barrier',
  'ML Triple-Barrier Inference': 'Inferencia ML Triple-Barrier',
  'Custom Rule-Based Constructor': 'Constructor de estrategias personalizado',
  'Default Model': 'Modelo predeterminado',
};

const formatStrategyLabelEs = (name: string, strategyId?: string) => {
  if (name.startsWith('Preset: ')) return `Preajuste: ${name.slice('Preset: '.length)}`;
  if (strategyId && STRATEGY_LABELS_BY_ID_ES[strategyId]) return STRATEGY_LABELS_BY_ID_ES[strategyId];
  return STRATEGY_LABELS_BY_NAME_ES[name] ?? name;
};

const getComparisonErrorEs = (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.response) return 'No se pudo conectar con la API de comparación.';
  return `La API no pudo completar la comparación (código ${formatNumber(error.response.status, 0, 0)}).`;
};

export const ModelComparisonView: React.FC = () => {
  const { params, strategies, presets } = useBacktest();

  const allOptions: SelectedModelOption[] = useMemo(() => [
    ...strategies.map((s) => ({
      type: 'base' as const,
      id: s.id,
      name: s.name,
      displayName: formatStrategyLabelEs(s.name, s.id),
      strategy_id: s.id,
      params: Object.fromEntries(s.parameters.map((p) => [p.name, p.default])),
    })),
    ...presets.map((p) => ({
      type: 'preset' as const,
      id: `preset_${p.preset_name}`,
      name: `Preset: ${p.preset_name}`,
      displayName: `Preajuste: ${p.preset_name}`,
      strategy_id: p.strategy_id,
      params: p.strategy_params,
    })),
  ], [strategies, presets]);

  const [selectedKeyA, setSelectedKeyA] = useState<string>(allOptions[0]?.id || 'regime_volatility_breakout');
  const [selectedKeyB, setSelectedKeyB] = useState<string>(allOptions[1]?.id || (allOptions[0]?.id || 'trend_following_ema'));
  const [compData, setCompData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the configuration of the currently displayed comparison results
  const [lastComparedConfig, setLastComparedConfig] = useState<{
    keyA: string;
    keyB: string;
    symbol: string;
    start_date: string;
    end_date: string;
  } | null>(null);

  const initialLoadedRef = useRef(false);

  const getModelConfig = (key: string): SelectedModelOption => {
    return allOptions.find((o) => o.id === key) || allOptions[0] || {
      type: 'base',
      id: 'regime_volatility_breakout',
      name: 'Default Model',
      displayName: 'Modelo predeterminado',
      strategy_id: 'regime_volatility_breakout',
      params: {},
    };
  };

  // Determine whether the current dropdowns/dates are out of sync with the rendered chart
  const isComparisonStale = useMemo(() => {
    if (!lastComparedConfig) return false;
    return (
      selectedKeyA !== lastComparedConfig.keyA ||
      selectedKeyB !== lastComparedConfig.keyB ||
      params.symbol !== lastComparedConfig.symbol ||
      params.start_date !== lastComparedConfig.start_date ||
      params.end_date !== lastComparedConfig.end_date
    );
  }, [selectedKeyA, selectedKeyB, params.symbol, params.start_date, params.end_date, lastComparedConfig]);

  const runComparison = async () => {
    setLoading(true);
    setError(null);

    const modelA = getModelConfig(selectedKeyA);
    const modelB = getModelConfig(selectedKeyB);

    const payload = {
      symbol: params.symbol,
      start_date: params.start_date,
      end_date: params.end_date,
      initial_capital: params.initial_capital,
      risk_fraction: params.risk_fraction,
      atr_multiplier_sl: params.atr_multiplier_sl,
      atr_multiplier_tp: params.atr_multiplier_tp,
      commission_bps: params.commission_bps,
      commission_fixed: params.commission_fixed,
      slippage_bps: params.slippage_bps,
      gap_slippage_enabled: params.gap_slippage_enabled,
      strategy_a: {
        strategy_id: modelA.strategy_id,
        strategy_params: modelA.params,
        name: modelA.name,
      },
      strategy_b: {
        strategy_id: modelB.strategy_id,
        strategy_params: modelB.params,
        name: modelB.name,
      },
    };

    try {
      const res = await axios.post<ComparisonResponse>('/api/backtest/compare', payload);
      setCompData(res.data);
      setLastComparedConfig({
        keyA: selectedKeyA,
        keyB: selectedKeyB,
        symbol: params.symbol,
        start_date: params.start_date,
        end_date: params.end_date,
      });
    } catch (err: unknown) {
      setError(getComparisonErrorEs(err));
    } finally {
      setLoading(false);
    }
  };

  // Only run comparison automatically on the first mount
  useEffect(() => {
    if (!initialLoadedRef.current && allOptions.length > 0) {
      initialLoadedRef.current = true;
      runComparison();
    }
  }, [allOptions]);

  const aWins = compData?.attribution.outperforming_strategy === 'A';
  const bWins = compData?.attribution.outperforming_strategy === 'B';
  const strategyAName = compData ? formatStrategyLabelEs(compData.strategy_a.strategy_name) : '';
  const strategyBName = compData ? formatStrategyLabelEs(compData.strategy_b.strategy_name) : '';
  const comparisonActionLabel = loading
    ? 'Calculando modelos…'
    : isComparisonStale
      ? 'Actualizar comparación'
      : 'Ejecutar comparativa';

  return (
    <div className="space-y-6">
      {/* Model Selection Header */}
      <div
        className={`p-5 rounded-xl transition border shadow-sm ${
          isComparisonStale
            ? 'bg-slate-900 border-amber-500/50 ring-1 ring-amber-500/20'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-white">
              <GitCompare className="text-emerald-400" size={18} />
              <h2 className="text-base font-bold">Comparativa multimodelo y atribución de Alpha</h2>
              {isComparisonStale && (
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle size={10} aria-hidden="true" /> SELECCIÓN PENDIENTE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compara dos estrategias cuantitativas sobre <span className="font-mono text-emerald-400 font-bold">{params.symbol}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Model A Selector */}
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-indigo-500/40 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-[11px] font-bold text-indigo-300 font-sans">Modelo A:</span>
              <select
                value={selectedKeyA}
                onChange={(e) => setSelectedKeyA(e.target.value)}
                aria-label="Seleccionar el modelo A"
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                {allOptions.map((opt) => (
                  <option key={`a_${opt.id}`} value={opt.id} className="bg-slate-900 text-white">
                    {opt.displayName}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-slate-500">frente a</span>

            {/* Model B Selector */}
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-emerald-500/40 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-bold text-emerald-300 font-sans">Modelo B:</span>
              <select
                value={selectedKeyB}
                onChange={(e) => setSelectedKeyB(e.target.value)}
                aria-label="Seleccionar el modelo B"
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                {allOptions.map((opt) => (
                  <option key={`b_${opt.id}`} value={opt.id} className="bg-slate-900 text-white">
                    {opt.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Unified Comparison Action Button */}
            <button
              type="button"
              onClick={runComparison}
              disabled={loading}
              aria-label={comparisonActionLabel}
              title={comparisonActionLabel}
              className={`font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shadow-md ${
                isComparisonStale
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950 font-bold'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950'
              }`}
            >
              {loading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Play size={13} className={isComparisonStale ? 'fill-slate-950' : ''} />
              )}
              {comparisonActionLabel}
            </button>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="text-rose-400 text-xs font-mono bg-rose-950/40 p-3 rounded-lg border border-rose-900">{error}</p>}

      {compData && (
        <>
          {/* Head-to-Head Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model A Card */}
            <div className={`p-5 rounded-xl border transition ${
              aWins ? 'bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" aria-hidden="true"></span> Estrategia A
                </span>
                {aWins && (
                  <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40 flex items-center gap-1">
                    <Trophy size={11} aria-hidden="true" /> GANADORA
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white truncate" title={strategyAName}>{strategyAName}</h3>
              <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">CAGR</span>
                  <span className="text-base font-bold text-white">{formatPercent(compData.strategy_a.cagr, false, 2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Sharpe</span>
                  <span className="text-base font-bold text-indigo-300">{formatNumber(compData.strategy_a.sharpe_ratio, 2, 2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Drawdown máximo</span>
                  <span className="text-sm font-bold text-rose-400">-{formatPercent(compData.strategy_a.max_drawdown_pct, false, 2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Alpha frente a Buy &amp; Hold</span>
                  <span className="text-sm font-bold text-emerald-400">+{formatPercent(compData.strategy_a.alpha, false, 2)}</span>
                </div>
              </div>
            </div>

            {/* Attribution Delta Summary Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Diferencial estadístico de Alpha (Δ A − B)
                </span>
                <div className="mt-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400 font-sans">Diferencia de CAGR:</span>
                    <span className={`font-bold ${compData.attribution.delta_cagr >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {formatPercent(compData.attribution.delta_cagr, true, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400 font-sans">Diferencial de Sharpe:</span>
                    <span className={`font-bold ${compData.attribution.delta_sharpe >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_sharpe >= 0 ? '+' : ''}{formatNumber(compData.attribution.delta_sharpe, 2, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400 font-sans">Exceso de Alpha:</span>
                    <span className={`font-bold ${compData.attribution.delta_alpha >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {formatPercent(compData.attribution.delta_alpha, true, 2)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Periodo evaluado: <span className="font-mono text-slate-300">{formatDate(compData.start_date)} → {formatDate(compData.end_date)}</span>
              </p>
            </div>

            {/* Model B Card */}
            <div className={`p-5 rounded-xl border transition ${
              bWins ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/50' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span> Estrategia B
                </span>
                {bWins && (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                    <Trophy size={11} aria-hidden="true" /> GANADORA
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white truncate" title={strategyBName}>{strategyBName}</h3>
              <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">CAGR</span>
                  <span className="text-base font-bold text-white">{formatPercent(compData.strategy_b.cagr, false, 2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Sharpe</span>
                  <span className="text-base font-bold text-emerald-300">{formatNumber(compData.strategy_b.sharpe_ratio, 2, 2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Drawdown máximo</span>
                  <span className="text-sm font-bold text-rose-400">-{formatPercent(compData.strategy_b.max_drawdown_pct, false, 2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Alpha frente a Buy &amp; Hold</span>
                  <span className="text-sm font-bold text-emerald-400">+{formatPercent(compData.strategy_b.alpha, false, 2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Overlaid Trajectory Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" aria-hidden="true" /> Curvas de patrimonio superpuestas frente a Buy &amp; Hold
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-3 h-0.5 bg-indigo-500" aria-hidden="true"></span> {strategyAName} (A)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400" aria-hidden="true"></span> {strategyBName} (B)
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-0.5 border-t border-dashed border-slate-400" aria-hidden="true"></span> {compData.symbol} Buy &amp; Hold
                </span>
              </div>
            </div>

            <div className="h-80 w-full" role="img" aria-label={`Curvas de patrimonio de ${strategyAName}, ${strategyBName} y Buy & Hold`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={compData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(value) => formatDate(value)} />
                  <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} tickFormatter={(value) => formatCompactCurrency(value)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '0.75rem' }}
                    formatter={(v, name) => {
                      const val = typeof v === 'number' ? formatCurrency(v) : String(v);
                      const nameMap: Record<string, string> = {
                        equity_a: `${strategyAName} (A)`,
                        equity_b: `${strategyBName} (B)`,
                        benchmark_equity: `${compData.symbol} Buy & Hold`,
                      };
                      return [val, nameMap[String(name)] || String(name)];
                    }}
                    labelFormatter={(value) => formatDate(value)}
                  />
                  <Line type="monotone" dataKey="equity_a" stroke="#6366f1" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="equity_b" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="benchmark_equity" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full Statistical Attribution Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Matriz completa de atribución de Alpha y microestructura</h3>
              <span className="text-xs text-slate-400 font-mono">Periodo: {formatDate(compData.start_date)} → {formatDate(compData.end_date)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <caption className="sr-only">Comparación cuantitativa y atribución entre los modelos A y B</caption>
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-sans">Métrica cuantitativa</th>
                    <th className="p-3 text-indigo-400 font-sans">Modelo A: {strategyAName}</th>
                    <th className="p-3 text-emerald-400 font-sans">Modelo B: {strategyBName}</th>
                    <th className="p-3 text-slate-300 font-sans">Diferencia (Δ A − B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Retorno total</td>
                    <td className="p-3 text-slate-200">{formatPercent(compData.strategy_a.total_return_pct, false, 2)}</td>
                    <td className="p-3 text-slate-200">{formatPercent(compData.strategy_b.total_return_pct, false, 2)}</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_return_pct >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {formatPercent(compData.attribution.delta_return_pct, true, 2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">CAGR</td>
                    <td className="p-3 text-slate-200">{formatPercent(compData.strategy_a.cagr, false, 2)}</td>
                    <td className="p-3 text-slate-200">{formatPercent(compData.strategy_b.cagr, false, 2)}</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_cagr >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {formatPercent(compData.attribution.delta_cagr, true, 2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Ratio de Sharpe</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_a.sharpe_ratio, 2, 2)}</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_b.sharpe_ratio, 2, 2)}</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_sharpe >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_sharpe >= 0 ? '+' : ''}{formatNumber(compData.attribution.delta_sharpe, 2, 2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Ratio de Sortino</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_a.sortino_ratio, 2, 2)}</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_b.sortino_ratio, 2, 2)}</td>
                    <td className="p-3 text-slate-300">
                      {(compData.strategy_a.sortino_ratio - compData.strategy_b.sortino_ratio) >= 0 ? '+' : ''}
                      {formatNumber(compData.strategy_a.sortino_ratio - compData.strategy_b.sortino_ratio, 2, 2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Drawdown máximo</td>
                    <td className="p-3 text-rose-400">-{formatPercent(compData.strategy_a.max_drawdown_pct, false, 2)}</td>
                    <td className="p-3 text-rose-400">-{formatPercent(compData.strategy_b.max_drawdown_pct, false, 2)}</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_max_dd <= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {formatPercent(compData.attribution.delta_max_dd, false, 2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Alpha (α) frente a Buy &amp; Hold</td>
                    <td className="p-3 text-slate-200">{formatPercent(compData.strategy_a.alpha, false, 2)}</td>
                    <td className="p-3 text-slate-200">{formatPercent(compData.strategy_b.alpha, false, 2)}</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_alpha >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {formatPercent(compData.attribution.delta_alpha, true, 2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Beta de mercado (β)</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_a.beta, 2, 2)}</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_b.beta, 2, 2)}</td>
                    <td className="p-3 text-slate-400">
                      {formatNumber(compData.strategy_a.beta - compData.strategy_b.beta, 2, 2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Tasa de acierto</td>
                    <td className="p-3 text-slate-200">{formatPercent(compData.strategy_a.win_rate_pct, false, 1)}</td>
                    <td className="p-3 text-slate-200">{formatPercent(compData.strategy_b.win_rate_pct, false, 1)}</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_win_rate >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {formatPercent(compData.attribution.delta_win_rate, true, 1)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Factor de beneficio</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_a.profit_factor, 2, 2)}</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_b.profit_factor, 2, 2)}</td>
                    <td className="p-3 text-slate-300">
                      {formatNumber(compData.strategy_a.profit_factor - compData.strategy_b.profit_factor, 2, 2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Total de operaciones cerradas</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_a.total_trades, 0, 0)}</td>
                    <td className="p-3 text-slate-200">{formatNumber(compData.strategy_b.total_trades, 0, 0)}</td>
                    <td className="p-3 text-slate-400">{formatNumber(compData.strategy_a.total_trades - compData.strategy_b.total_trades, 0, 0)} operaciones</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Fricciones totales pagadas (fees + slippage)</td>
                    <td className="p-3 text-amber-400">{formatCurrency(-compData.strategy_a.total_frictions)}</td>
                    <td className="p-3 text-amber-400">{formatCurrency(-compData.strategy_b.total_frictions)}</td>
                    <td className="p-3 text-slate-400">
                      {formatCurrency(-(compData.strategy_a.total_frictions - compData.strategy_b.total_frictions))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};