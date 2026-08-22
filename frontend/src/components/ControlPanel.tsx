// frontend/src/components/ControlPanel.tsx
import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Coins,
  Building2,
  Sliders,
  Dna,
  ChevronDown,
  ChevronUp,
  Layers,
  Bookmark,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { BacktestParams, StrategyMetadata, StrategyPreset } from '../types/backtest';

const ASSET_PRESETS = [
  { symbol: 'AAPL', label: 'Apple Inc.', type: 'equity' },
  { symbol: 'NVDA', label: 'NVIDIA Corp.', type: 'equity' },
  { symbol: 'SPY', label: 'S&P 500 ETF', type: 'equity' },
  { symbol: 'BTC-USD', label: 'Bitcoin (USD)', type: 'crypto' },
  { symbol: 'ETH-USD', label: 'Ethereum (USD)', type: 'crypto' },
  { symbol: 'SOL-USD', label: 'Solana (USD)', type: 'crypto' },
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  const [strategies, setStrategies] = useState<StrategyMetadata[]>([]);
  const [presets, setPresets] = useState<StrategyPreset[]>([]);
  const [selectedPresetName, setSelectedPresetName] = useState<string>('');
  
  // Preset modal form states
  const [newPresetName, setNewPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetSaving, setPresetSaving] = useState(false);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);

  // Fetch strategies and saved presets
  const loadStrategiesAndPresets = useCallback(async () => {
    try {
      const [stratRes, presetRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/backtest/strategies'),
        fetch('http://127.0.0.1:8000/api/backtest/presets'),
      ]);

      if (stratRes.ok) {
        const stratData = await stratRes.json();
        setStrategies(stratData.strategies || []);
      }

      if (presetRes.ok) {
        const presetData = await presetRes.json();
        setPresets(presetData.presets || []);
      }
    } catch (err) {
      console.error('Failed to load strategies or presets:', err);
    }
  }, []);

  useEffect(() => {
    loadStrategiesAndPresets();
  }, [loadStrategiesAndPresets]);

  const activeStrategy = strategies.find((s) => s.id === params.strategy_id) || strategies[0];

  const handleStrategyChange = (strategyId: string) => {
    setSelectedPresetName('');
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

  const handleApplyPreset = (presetName: string) => {
    setSelectedPresetName(presetName);
    if (!presetName) return;

    const p = presets.find((item) => item.preset_name === presetName);
    if (!p) return;

    setParams((prev) => ({
      ...prev,
      strategy_id: p.strategy_id,
      strategy_params: { ...p.strategy_params },
      risk_fraction: p.risk_fraction,
      atr_multiplier_sl: p.atr_multiplier_sl,
      atr_multiplier_tp: p.atr_multiplier_tp,
      commission_bps: p.commission_bps,
      commission_fixed: p.commission_fixed,
      slippage_bps: p.slippage_bps,
      gap_slippage_enabled: p.gap_slippage_enabled,
    }));
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    setPresetSaving(true);
    setPresetMsg(null);

    const payload = {
      preset_name: newPresetName.trim(),
      strategy_id: params.strategy_id,
      strategy_params: params.strategy_params,
      risk_fraction: params.risk_fraction,
      atr_multiplier_sl: params.atr_multiplier_sl,
      atr_multiplier_tp: params.atr_multiplier_tp,
      commission_bps: params.commission_bps,
      commission_fixed: params.commission_fixed,
      slippage_bps: params.slippage_bps,
      gap_slippage_enabled: params.gap_slippage_enabled,
      description: presetDescription.trim(),
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/backtest/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save preset');
      }

      await loadStrategiesAndPresets();
      setSelectedPresetName(payload.preset_name);
      setShowSaveModal(false);
      setNewPresetName('');
      setPresetDescription('');
    } catch (err: any) {
      setPresetMsg(err.message);
    } finally {
      setPresetSaving(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPresetName) return;
    if (!window.confirm(`Delete preset "${selectedPresetName}"?`)) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/backtest/presets/${encodeURIComponent(selectedPresetName)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSelectedPresetName('');
        await loadStrategiesAndPresets();
      }
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
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
      {/* Top Bar: Asset Selection & Saved Strategy Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        {/* Asset Quick Selector */}
        <div className="flex flex-wrap gap-2">
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

        {/* Strategy Profile Preset Manager */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <Bookmark size={13} className="text-amber-400 mr-1.5" />
            <select
              value={selectedPresetName}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">
                — Load Saved Preset —
              </option>
              {presets.map((pr) => (
                <option key={pr.preset_name} value={pr.preset_name} className="bg-slate-900 text-white">
                  {pr.preset_name} ({pr.strategy_id})
                </option>
              ))}
            </select>
          </div>

          {selectedPresetName && (
            <button
              type="button"
              onClick={handleDeletePreset}
              title="Delete loaded preset"
              className="p-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
            >
              <Trash2 size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition"
          >
            <Save size={13} /> Save Preset
          </button>
        </div>
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
                  <option key={strat.id} value={strat.id} className="bg-slate-900 text-white">
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

      {/* Save Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark className="text-amber-400" size={16} /> Save Strategy Preset
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Preset Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. BTC Breakout Aggressive (10-30)"
                  required
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Strategy Architecture</label>
                <input
                  type="text"
                  disabled
                  value={activeStrategy?.name || params.strategy_id}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Optimized for 2023-2024 bull cycle with 1.5 ATR trailing stops"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {presetMsg && <p className="text-xs text-rose-400">{presetMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="text-xs px-3 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={presetSaving}
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {presetSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});