// src/components/ControlPanel.tsx
import React, { memo, useState, useEffect } from 'react';
import { Play, Coins, Building2, Sliders, Dna, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { BacktestParams, StrategyMetadata } from '../types/backtest';

const ASSET_PRESETS = [
  { symbol: 'AAPL', label: 'Apple Inc.', type: 'equity' },
  { symbol: 'NVDA', label: 'NVIDIA Corp.', type: 'equity' },
  { symbol: 'SPY', label: 'S&P 500 ETF', type: 'equity' },
  { symbol: 'BTC-USD', label: 'Bitcoin (USD)', type: 'crypto' },
  { symbol: 'ETH-USD', label: 'Ethereum (USD)', type: 'crypto' },
  { symbol: 'SOL-USD', label: 'Solana (USD)', type: 'crypto' },
];

const DEFAULT_STRATEGIES: StrategyMetadata[] = [
  {
    id: 'regime_volatility_breakout',
    name: 'Regime-Filtered Volatility Breakout',
    description: 'Donchian channel breakout filtered by ADX and volume expansion.',
    category: 'Rule-Based',
    parameters: [
      { name: 'channel_period', label: 'Donchian Channel Period', param_type: 'int', default: 20, min_value: 5, max_value: 100, step: 1, description: 'Lookback window' },
      { name: 'adx_period', label: 'ADX Period', param_type: 'int', default: 14, min_value: 5, max_value: 50, step: 1, description: 'ADX calculation window' },
      { name: 'adx_threshold', label: 'ADX Threshold', param_type: 'float', default: 25.0, min_value: 10.0, max_value: 50.0, step: 1.0, description: 'Trend strength filter' },
      { name: 'volume_ma_period', label: 'Volume MA Lookback', param_type: 'int', default: 20, min_value: 5, max_value: 100, step: 1, description: 'Baseline volume window' },
      { name: 'volume_multiplier', label: 'Volume Expansion Factor', param_type: 'float', default: 1.2, min_value: 0.5, max_value: 3.0, step: 0.1, description: 'Relative volume threshold' },
      { name: 'atr_period', label: 'ATR Period', param_type: 'int', default: 14, min_value: 5, max_value: 50, step: 1, description: 'Volatility sizing period' },
    ],
  },
  {
    id: 'trend_following_ema',
    name: 'EMA Trend Following',
    description: 'Fast/Slow Exponential Moving Average crossover system.',
    category: 'Rule-Based',
    parameters: [
      { name: 'fast_ema', label: 'Fast EMA Period', param_type: 'int', default: 20, min_value: 3, max_value: 100, step: 1, description: 'Fast EMA window' },
      { name: 'slow_ema', label: 'Slow EMA Period', param_type: 'int', default: 50, min_value: 10, max_value: 300, step: 1, description: 'Slow EMA window' },
      { name: 'atr_period', label: 'ATR Period', param_type: 'int', default: 14, min_value: 5, max_value: 50, step: 1, description: 'Volatility sizing period' },
    ],
  },
];

interface ControlPanelProps {
  params: BacktestParams;
  setParams: React.Dispatch<React.SetStateAction<BacktestParams>>;
  onSubmit: (e?: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

export const ControlPanel = memo(({ params, setParams, onSubmit, loading, error }: ControlPanelProps) => {
  const [showFrictions, setShowFrictions] = useState(false);
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const [strategies, setStrategies] = useState<StrategyMetadata[]>(DEFAULT_STRATEGIES);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/backtest/strategies')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.strategies && Array.isArray(data.strategies) && data.strategies.length > 0) {
          setStrategies(data.strategies);

          const currentValid = data.strategies.some((s: StrategyMetadata) => s.id === params.strategy_id);
          if (!params.strategy_id || !currentValid) {
            const first = data.strategies[0];
            const defaults: Record<string, any> = {};
            first.parameters.forEach((p: any) => {
              defaults[p.name] = p.default;
            });
            setParams((prev) => ({
              ...prev,
              strategy_id: first.id,
              strategy_params: defaults,
            }));
          }
        }
      })
      .catch((err) => console.warn('Using default fallback strategies:', err));
  }, []);

  const activeStrategy = strategies.find((s) => s.id === params.strategy_id) || strategies[0] || DEFAULT_STRATEGIES[0];

  const handleStrategyChange = (strategyId: string) => {
    const selected = strategies.find((s) => s.id === strategyId);
    if (!selected) return;

    const defaults: Record<string, any> = {};
    selected.parameters.forEach((p) => {
      defaults[p.name] = p.default;
    });

    setParams((prev) => ({
      ...prev,
      strategy_id: selected.id,
      strategy_params: defaults,
    }));
  };

  const handleParamChange = (name: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      strategy_params: {
        ...(prev.strategy_params || {}),
        [name]: value,
      },
    }));
  };

  return (
    <>
      {/* Asset Quick Selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ASSET_PRESETS.map((preset) => (
          <button
            key={preset.symbol}
            type="button"
            onClick={() => setParams((p) => ({ ...p, symbol: preset.symbol }))}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
              params.symbol === preset.symbol
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
            }`}
          >
            {preset.type === 'crypto' ? <Coins size={13} /> : <Building2 size={13} />}
            {preset.symbol}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-sm">
        <form onSubmit={onSubmit}>
          {/* Row 1: Strategy Selector & Core Market Setup */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4 pb-4 border-b border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                <Layers size={13} /> Strategy Engine
              </label>
              <select
                value={params.strategy_id || activeStrategy?.id}
                onChange={(e) => handleStrategyChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {strategies.map((strat) => (
                  <option key={strat.id} value={strat.id} className="bg-slate-900 text-white py-1">
                    {strat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Asset Symbol</label>
              <input
                type="text"
                value={params.symbol}
                onChange={(e) => setParams({ ...params, symbol: e.target.value.toUpperCase() })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={params.start_date}
                onChange={(e) => setParams({ ...params, start_date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={params.end_date}
                onChange={(e) => setParams({ ...params, end_date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Capital ($)</label>
              <input
                type="number"
                value={params.initial_capital}
                onChange={(e) => setParams({ ...params, initial_capital: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Dynamic Strategy Parameters + Risk Bounds + Run Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            {activeStrategy?.parameters.map((p) => {
              const val = params.strategy_params?.[p.name] ?? p.default;
              return (
                <div key={p.name}>
                  <label className="block text-xs font-semibold text-indigo-300 mb-1 truncate" title={p.label}>
                    {p.label}
                  </label>
                  <input
                    type="number"
                    step={p.step || (p.param_type === 'int' ? 1 : 0.1)}
                    min={p.min_value}
                    max={p.max_value}
                    value={val}
                    onChange={(e) =>
                      handleParamChange(
                        p.name,
                        p.param_type === 'int' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              );
            })}

            <div>
              <label className="block text-xs font-semibold text-rose-400 mb-1">SL ATR (x)</label>
              <input
                type="number"
                step="0.1"
                value={params.atr_multiplier_sl}
                onChange={(e) => setParams({ ...params, atr_multiplier_sl: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">TP ATR (x)</label>
              <input
                type="number"
                step="0.1"
                value={params.atr_multiplier_tp}
                onChange={(e) => setParams({ ...params, atr_multiplier_tp: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50 text-sm shadow-md"
              >
                <Play size={15} /> {loading ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>
          </div>

          {/* Sub-Panel Accordion Toggles */}
          <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setShowFrictions(!showFrictions)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition select-none"
            >
              <Sliders size={14} /> Market Frictions & Cost Model
              {showFrictions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={() => setShowMonteCarlo(!showMonteCarlo)}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition select-none"
            >
              <Dna size={14} /> Monte Carlo Stress Testing
              {showMonteCarlo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Friction Sub-Panel */}
          {showFrictions && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Commission (bps) <span className="text-slate-500">(1 bps = 0.01%)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={params.commission_bps}
                  onChange={(e) => setParams({ ...params, commission_bps: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Fixed Fee ($/order)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={params.commission_fixed}
                  onChange={(e) => setParams({ ...params, commission_fixed: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Adverse Slippage (bps) <span className="text-slate-500">(Spread / Delay)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={params.slippage_bps}
                  onChange={(e) => setParams({ ...params, slippage_bps: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="gap_slippage"
                  checked={params.gap_slippage_enabled}
                  onChange={(e) => setParams({ ...params, gap_slippage_enabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="gap_slippage" className="text-xs text-slate-300 cursor-pointer select-none">
                  Enable Gap-Down SL Slippage
                </label>
              </div>
            </div>
          )}

          {/* Monte Carlo Sub-Panel */}
          {showMonteCarlo && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Resample Iterations (B) <span className="text-slate-500">(100 - 10,000)</span>
                </label>
                <input
                  type="number"
                  step="100"
                  min="100"
                  max="10000"
                  value={params.num_simulations ?? 1000}
                  onChange={(e) => setParams({ ...params, num_simulations: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Ruin Drawdown Barrier (%) <span className="text-slate-500">(Max Loss Tolerance)</span>
                </label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="95"
                  value={params.ruin_threshold_pct ?? 30.0}
                  onChange={(e) => setParams({ ...params, ruin_threshold_pct: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}
        </form>

        {error && <p className="text-rose-400 text-xs mt-3 font-mono">{error}</p>}
      </div>
    </>
  );
});