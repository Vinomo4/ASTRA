// frontend/src/components/views/ModelComparisonView.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { GitCompare, Trophy, TrendingUp, Play, AlertCircle, RefreshCw } from 'lucide-react';
import { useBacktest } from '../../context/BacktestContext';
import type { ComparisonResponse } from '../../types/backtest';

interface SelectedModelOption {
  type: 'base' | 'preset';
  id: string;
  name: string;
  strategy_id: string;
  params: Record<string, any>;
}

export const ModelComparisonView: React.FC = () => {
  const { params, strategies, presets } = useBacktest();

  const allOptions: SelectedModelOption[] = useMemo(() => [
    ...strategies.map((s) => ({
      type: 'base' as const,
      id: s.id,
      name: s.name,
      strategy_id: s.id,
      params: Object.fromEntries(s.parameters.map((p) => [p.name, p.default])),
    })),
    ...presets.map((p) => ({
      type: 'preset' as const,
      id: `preset_${p.preset_name}`,
      name: `Preset: ${p.preset_name}`,
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
      const res = await axios.post<ComparisonResponse>('http://127.0.0.1:8000/api/backtest/compare', payload);
      setCompData(res.data);
      setLastComparedConfig({
        keyA: selectedKeyA,
        keyB: selectedKeyB,
        symbol: params.symbol,
        start_date: params.start_date,
        end_date: params.end_date,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Comparison failed');
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
              <h2 className="text-base font-bold">Multi-Model Benchmark & Alpha Attribution</h2>
              {isComparisonStale && (
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle size={10} /> Selection Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare two quantitative architectures on <span className="font-mono text-emerald-400 font-bold">{params.symbol}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Model A Selector */}
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-indigo-500/40 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-[11px] font-bold text-indigo-300 font-sans">Model A:</span>
              <select
                value={selectedKeyA}
                onChange={(e) => setSelectedKeyA(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                {allOptions.map((opt) => (
                  <option key={`a_${opt.id}`} value={opt.id} className="bg-slate-900 text-white">
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-slate-500">VS</span>

            {/* Model B Selector */}
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-emerald-500/40 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-bold text-emerald-300 font-sans">Model B:</span>
              <select
                value={selectedKeyB}
                onChange={(e) => setSelectedKeyB(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                {allOptions.map((opt) => (
                  <option key={`b_${opt.id}`} value={opt.id} className="bg-slate-900 text-white">
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unified Comparison Action Button */}
            <button
              type="button"
              onClick={runComparison}
              disabled={loading}
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
              {loading ? 'Calculating Models...' : isComparisonStale ? 'Update Comparison' : 'Run Benchmark'}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-rose-400 text-xs font-mono bg-rose-950/40 p-3 rounded-lg border border-rose-900">{error}</p>}

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
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Strategy A
                </span>
                {aWins && (
                  <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40 flex items-center gap-1">
                    <Trophy size={11} /> WINNER
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white truncate">{compData.strategy_a.strategy_name}</h3>
              <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">CAGR</span>
                  <span className="text-base font-bold text-white">{compData.strategy_a.cagr.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Sharpe</span>
                  <span className="text-base font-bold text-indigo-300">{compData.strategy_a.sharpe_ratio.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Max Drawdown</span>
                  <span className="text-sm font-bold text-rose-400">-{compData.strategy_a.max_drawdown_pct.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Alpha vs B&H</span>
                  <span className="text-sm font-bold text-emerald-400">+{compData.strategy_a.alpha.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Attribution Delta Summary Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Statistical Alpha Spread ($\Delta A - B$)
                </span>
                <div className="mt-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400 font-sans">CAGR Delta:</span>
                    <span className={`font-bold ${compData.attribution.delta_cagr >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_cagr >= 0 ? '+' : ''}{compData.attribution.delta_cagr.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400 font-sans">Sharpe Spread:</span>
                    <span className={`font-bold ${compData.attribution.delta_sharpe >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_sharpe >= 0 ? '+' : ''}{compData.attribution.delta_sharpe.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400 font-sans">Excess Alpha:</span>
                    <span className={`font-bold ${compData.attribution.delta_alpha >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_alpha >= 0 ? '+' : ''}{compData.attribution.delta_alpha.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Evaluated over window: <span className="font-mono text-slate-300">{compData.start_date} → {compData.end_date}</span>
              </p>
            </div>

            {/* Model B Card */}
            <div className={`p-5 rounded-xl border transition ${
              bWins ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/50' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Strategy B
                </span>
                {bWins && (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                    <Trophy size={11} /> WINNER
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white truncate">{compData.strategy_b.strategy_name}</h3>
              <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">CAGR</span>
                  <span className="text-base font-bold text-white">{compData.strategy_b.cagr.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Sharpe</span>
                  <span className="text-base font-bold text-emerald-300">{compData.strategy_b.sharpe_ratio.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Max Drawdown</span>
                  <span className="text-sm font-bold text-rose-400">-{compData.strategy_b.max_drawdown_pct.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Alpha vs B&H</span>
                  <span className="text-sm font-bold text-emerald-400">+{compData.strategy_b.alpha.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Overlaid Trajectory Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" /> Overlaid Portfolio Equity Curves vs. Buy & Hold Benchmark
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-3 h-0.5 bg-indigo-500"></span> {compData.strategy_a.strategy_name} (A)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400"></span> {compData.strategy_b.strategy_name} (B)
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-0.5 border-t border-dashed border-slate-400"></span> {compData.symbol} Benchmark
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={compData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '0.75rem' }}
                    formatter={(v: any, name: any) => {
                      const val = typeof v === 'number' ? `$${v.toLocaleString()}` : String(v);
                      const nameMap: Record<string, string> = {
                        equity_a: `${compData.strategy_a.strategy_name} (A)`,
                        equity_b: `${compData.strategy_b.strategy_name} (B)`,
                        benchmark_equity: `${compData.symbol} Buy & Hold`,
                      };
                      return [val, nameMap[String(name)] || String(name)];
                    }}
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
              <h3 className="text-sm font-bold text-white">Full Alpha & Microstructure Attribution Matrix</h3>
              <span className="text-xs text-slate-400 font-mono">Window: {compData.start_date} → {compData.end_date}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-sans">Quantitative Metric</th>
                    <th className="p-3 text-indigo-400 font-sans">Model A: {compData.strategy_a.strategy_name}</th>
                    <th className="p-3 text-emerald-400 font-sans">Model B: {compData.strategy_b.strategy_name}</th>
                    <th className="p-3 text-slate-300 font-sans">Spread Delta ($\Delta A - B$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Total Return</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.total_return_pct.toFixed(2)}%</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.total_return_pct.toFixed(2)}%</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_return_pct >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_return_pct >= 0 ? '+' : ''}{compData.attribution.delta_return_pct.toFixed(2)}%
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">CAGR</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.cagr.toFixed(2)}%</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.cagr.toFixed(2)}%</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_cagr >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_cagr >= 0 ? '+' : ''}{compData.attribution.delta_cagr.toFixed(2)}%
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Sharpe Ratio</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.sharpe_ratio.toFixed(2)}</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.sharpe_ratio.toFixed(2)}</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_sharpe >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_sharpe >= 0 ? '+' : ''}{compData.attribution.delta_sharpe.toFixed(2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Sortino Ratio</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.sortino_ratio.toFixed(2)}</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.sortino_ratio.toFixed(2)}</td>
                    <td className="p-3 text-slate-300">
                      {(compData.strategy_a.sortino_ratio - compData.strategy_b.sortino_ratio) >= 0 ? '+' : ''}
                      {(compData.strategy_a.sortino_ratio - compData.strategy_b.sortino_ratio).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Max Drawdown</td>
                    <td className="p-3 text-rose-400">-{compData.strategy_a.max_drawdown_pct.toFixed(2)}%</td>
                    <td className="p-3 text-rose-400">-{compData.strategy_b.max_drawdown_pct.toFixed(2)}%</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_max_dd <= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_max_dd.toFixed(2)}%
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Alpha ($\alpha$) vs B&H</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.alpha.toFixed(2)}%</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.alpha.toFixed(2)}%</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_alpha >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_alpha >= 0 ? '+' : ''}{compData.attribution.delta_alpha.toFixed(2)}%
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Market Beta ($\beta$)</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.beta.toFixed(2)}</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.beta.toFixed(2)}</td>
                    <td className="p-3 text-slate-400">
                      {(compData.strategy_a.beta - compData.strategy_b.beta).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Win Rate</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.win_rate_pct.toFixed(1)}%</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.win_rate_pct.toFixed(1)}%</td>
                    <td className={`p-3 font-bold ${compData.attribution.delta_win_rate >= 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {compData.attribution.delta_win_rate >= 0 ? '+' : ''}{compData.attribution.delta_win_rate.toFixed(1)}%
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Profit Factor</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.profit_factor.toFixed(2)}</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.profit_factor.toFixed(2)}</td>
                    <td className="p-3 text-slate-300">
                      {(compData.strategy_a.profit_factor - compData.strategy_b.profit_factor).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Total Completed Trades</td>
                    <td className="p-3 text-slate-200">{compData.strategy_a.total_trades}</td>
                    <td className="p-3 text-slate-200">{compData.strategy_b.total_trades}</td>
                    <td className="p-3 text-slate-400">{compData.strategy_a.total_trades - compData.strategy_b.total_trades} trades</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="p-3 font-sans font-semibold text-white">Total Frictions Paid (Fees + Slip)</td>
                    <td className="p-3 text-amber-400">-${compData.strategy_a.total_frictions.toLocaleString()}</td>
                    <td className="p-3 text-amber-400">-${compData.strategy_b.total_frictions.toLocaleString()}</td>
                    <td className="p-3 text-slate-400">
                      -${(compData.strategy_a.total_frictions - compData.strategy_b.total_frictions).toFixed(2)}
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