// frontend/src/components/views/StrategyStudioView.tsx
import React, { useState } from 'react';
import axios from 'axios';
import {
  Coins,
  Building2,
  Sliders,
  Dna,
  Save,
  Trash2,
  Plus,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useBacktest } from '../../context/BacktestContext';
import type { StrategyRule } from '../../types/backtest';

const ASSET_PRESETS = [
  { symbol: 'AAPL', label: 'Apple Inc.', type: 'equity' },
  { symbol: 'NVDA', label: 'NVIDIA Corp.', type: 'equity' },
  { symbol: 'SPY', label: 'S&P 500 ETF', type: 'equity' },
  { symbol: 'BTC-USD', label: 'Bitcoin (USD)', type: 'crypto' },
  { symbol: 'ETH-USD', label: 'Ethereum (USD)', type: 'crypto' },
  { symbol: 'SOL-USD', label: 'Solana (USD)', type: 'crypto' },
];

const AVAILABLE_INDICATORS = [
  { value: 'close', label: 'Close Price' },
  { value: 'open', label: 'Open Price' },
  { value: 'high', label: 'High Price' },
  { value: 'low', label: 'Low Price' },
  { value: 'ema_fast', label: 'Fast EMA' },
  { value: 'ema_slow', label: 'Slow EMA' },
  { value: 'rsi', label: 'RSI Value' },
  { value: 'donchian_high', label: 'Donchian Upper High' },
  { value: 'donchian_low', label: 'Donchian Lower Low' },
  { value: 'volume', label: 'Volume' },
  { value: 'volume_ma', label: 'Volume MA' },
];

export const StrategyStudioView: React.FC = () => {
  const {
    params,
    setParams,
    strategies,
    presets,
    selectedPreset,
    applyPreset,
    reloadPresets,
    selectAsset,
    runSimulation,
    error,
  } = useBacktest();

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'builder' | 'frictions'>('catalog');
  const [newPresetName, setNewPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [entryRules, setEntryRules] = useState<StrategyRule[]>([
    { id: '1', indicator_a: 'close', operator: '>', indicator_b: 'ema_fast' },
    { id: '2', indicator_a: 'rsi', operator: '<', threshold: 70 },
  ]);

  const [exitRules, setExitRules] = useState<StrategyRule[]>([
    { id: '1', indicator_a: 'close', operator: '<', indicator_b: 'ema_slow' },
  ]);

  const handleAddEntryRule = () => {
    setEntryRules([
      ...entryRules,
      { id: Date.now().toString(), indicator_a: 'close', operator: '>', indicator_b: 'ema_slow' },
    ]);
  };

  const handleRemoveEntryRule = (id: string) => {
    setEntryRules(entryRules.filter((r) => r.id !== id));
  };

  const handleAddExitRule = () => {
    setExitRules([
      ...exitRules,
      { id: Date.now().toString(), indicator_a: 'rsi', operator: '>', threshold: 75 },
    ]);
  };

  const handleRemoveExitRule = (id: string) => {
    setExitRules(exitRules.filter((r) => r.id !== id));
  };

  const handleApplyRulesToEngine = () => {
    const updated = {
      ...params,
      strategy_id: 'custom_rule_strategy',
      strategy_params: {
        ...params.strategy_params,
        entry_rules: entryRules,
        exit_rules: exitRules,
      },
    };
    setParams(updated);
    runSimulation(updated);
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const payload = {
      preset_name: newPresetName.trim(),
      strategy_id: params.strategy_id,
      strategy_params: {
        ...params.strategy_params,
        ...(params.strategy_id === 'custom_rule_strategy'
          ? { entry_rules: entryRules, exit_rules: exitRules }
          : {}),
      },
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
      await axios.post('http://127.0.0.1:8000/api/backtest/presets', payload);
      await reloadPresets();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setNewPresetName('');
      setPresetDescription('');
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  const handleDeletePreset = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete strategy preset "${name}"?`)) return;

    try {
      await axios.delete(`http://127.0.0.1:8000/api/backtest/presets/${encodeURIComponent(name)}`);
      await reloadPresets();
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Asset Quick Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Asset:</span>
          {ASSET_PRESETS.map((preset) => (
            <button
              key={preset.symbol}
              type="button"
              onClick={() => selectAsset(preset.symbol)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                params.symbol === preset.symbol
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {preset.type === 'crypto' ? <Coins size={13} /> : <Building2 size={13} />}
              {preset.symbol}
            </button>
          ))}
        </div>

        {/* Studio Sub-Navigation */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('catalog')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeSubTab === 'catalog' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Strategy Catalog ({presets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('builder')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1 ${
              activeSubTab === 'builder' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} /> Rule Constructor
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('frictions')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeSubTab === 'frictions' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Frictions & Sizing
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: Strategy Catalog */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="text-emerald-400" size={18} /> Quantitative Strategy Catalog
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Clicking any strategy or preset instantly updates and executes the backtest model.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setParams((p) => ({ ...p, strategy_id: 'custom_rule_strategy' }));
                setActiveSubTab('builder');
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md"
            >
              <Plus size={14} /> Create Custom Rules
            </button>
          </div>

          {/* Standard Templates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Standard Architectures
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategies.map((strat) => {
                const isSelected = params.strategy_id === strat.id && !selectedPreset;
                return (
                  <div
                    key={strat.id}
                    onClick={() => {
                      applyPreset('');
                      const updated = { ...params, strategy_id: strat.id };
                      setParams(updated);
                      runSimulation(updated);
                    }}
                    className={`p-5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white">{strat.name}</span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {strat.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {strat.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono">{strat.parameters.length} Parameters</span>
                      <span className={`font-semibold flex items-center gap-1 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isSelected ? 'Active Model' : 'Select'} <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saved User Presets */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Saved Strategy Profiles ({presets.length})
            </h3>
            {presets.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                <p className="text-sm">No custom strategy presets saved yet.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tune any strategy and save it to build your personal quant repository.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {presets.map((preset) => {
                  const isSelected = selectedPreset === preset.preset_name;
                  return (
                    <div
                      key={preset.preset_name}
                      onClick={() => applyPreset(preset.preset_name)}
                      className={`p-5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm text-white">{preset.preset_name}</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePreset(preset.preset_name, e)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60">
                          Base: {preset.strategy_id}
                        </span>
                        <p className="text-xs text-slate-400 mt-2.5 line-clamp-2">
                          {preset.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-mono text-[11px]">{preset.updated_at?.split(' ')[0]}</span>
                        <span className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                          {isSelected ? 'Loaded' : 'Load Preset'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Visual Rule Constructor */}
      {activeSubTab === 'builder' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="text-indigo-400" size={16} /> Strategy Logic Builder
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Build custom trigger conditions evaluated bar-by-bar during the backtest.
                </p>
              </div>

              <button
                type="button"
                onClick={handleApplyRulesToEngine}
                className="text-xs font-semibold px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-md"
              >
                Apply & Execute Rules
              </button>
            </div>

            {/* Entry Conditions */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Entry Trigger Rules (All must be TRUE to enter LONG)
                </span>
                <button
                  type="button"
                  onClick={handleAddEntryRule}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Plus size={13} /> Add Condition
                </button>
              </div>

              <div className="space-y-2.5">
                {entryRules.map((rule, idx) => (
                  <div key={rule.id} className="flex flex-wrap items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>

                    <select
                      value={rule.indicator_a}
                      onChange={(e) => {
                        const updated = [...entryRules];
                        updated[idx].indicator_a = e.target.value;
                        setEntryRules(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      {AVAILABLE_INDICATORS.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={rule.operator}
                      onChange={(e) => {
                        const updated = [...entryRules];
                        updated[idx].operator = e.target.value as any;
                        setEntryRules(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-bold rounded-lg px-2 py-1.5 focus:outline-none"
                    >
                      <option value=">">&gt; Greater than</option>
                      <option value="<">&lt; Less than</option>
                      <option value=">=">&gt;= Greater or Equal</option>
                      <option value="<=">&lt;= Less or Equal</option>
                      <option value="==">== Equals</option>
                    </select>

                    <select
                      value={rule.indicator_b || 'static'}
                      onChange={(e) => {
                        const updated = [...entryRules];
                        if (e.target.value === 'static') {
                          updated[idx].indicator_b = undefined;
                          updated[idx].threshold = 50;
                        } else {
                          updated[idx].indicator_b = e.target.value;
                          updated[idx].threshold = undefined;
                        }
                        setEntryRules(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="static">Static Numeric Value</option>
                      {AVAILABLE_INDICATORS.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </select>

                    {rule.threshold !== undefined && (
                      <input
                        type="number"
                        value={rule.threshold}
                        onChange={(e) => {
                          const updated = [...entryRules];
                          updated[idx].threshold = parseFloat(e.target.value) || 0;
                          setEntryRules(updated);
                        }}
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 w-24 focus:outline-none font-mono"
                      />
                    )}

                    {entryRules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntryRule(rule.id)}
                        className="text-slate-500 hover:text-rose-400 ml-auto p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Exit Conditions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Exit Trigger Rules (Any condition triggers a market exit)
                </span>
                <button
                  type="button"
                  onClick={handleAddExitRule}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Plus size={13} /> Add Condition
                </button>
              </div>

              <div className="space-y-2.5">
                {exitRules.map((rule, idx) => (
                  <div key={rule.id} className="flex flex-wrap items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>

                    <select
                      value={rule.indicator_a}
                      onChange={(e) => {
                        const updated = [...exitRules];
                        updated[idx].indicator_a = e.target.value;
                        setExitRules(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      {AVAILABLE_INDICATORS.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={rule.operator}
                      onChange={(e) => {
                        const updated = [...exitRules];
                        updated[idx].operator = e.target.value as any;
                        setExitRules(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-rose-400 font-bold rounded-lg px-2 py-1.5 focus:outline-none"
                    >
                      <option value=">">&gt; Greater than</option>
                      <option value="<">&lt; Less than</option>
                      <option value=">=">&gt;= Greater or Equal</option>
                      <option value="<=">&lt;= Less or Equal</option>
                    </select>

                    <select
                      value={rule.indicator_b || 'static'}
                      onChange={(e) => {
                        const updated = [...exitRules];
                        if (e.target.value === 'static') {
                          updated[idx].indicator_b = undefined;
                          updated[idx].threshold = 50;
                        } else {
                          updated[idx].indicator_b = e.target.value;
                          updated[idx].threshold = undefined;
                        }
                        setExitRules(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="static">Static Numeric Value</option>
                      {AVAILABLE_INDICATORS.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </select>

                    {rule.threshold !== undefined && (
                      <input
                        type="number"
                        value={rule.threshold}
                        onChange={(e) => {
                          const updated = [...exitRules];
                          updated[idx].threshold = parseFloat(e.target.value) || 0;
                          setExitRules(updated);
                        }}
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 w-24 focus:outline-none font-mono"
                      />
                    )}

                    {exitRules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExitRule(rule.id)}
                        className="text-slate-500 hover:text-rose-400 ml-auto p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preset Save Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Save size={15} className="text-amber-400" /> Save Current Architecture as Custom Strategy
            </h3>
            <form onSubmit={handleSavePreset} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. BTC Trend+RSI Filter"
                  required
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Enters when above EMA20 with RSI under 70"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition"
                >
                  Save to Catalog
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 size={14} /> Saved!
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Frictions & Sizing */}
      {activeSubTab === 'frictions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={15} className="text-indigo-400" /> Market Frictions & Broker Cost Model
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Commission (bps) (1 bps = 0.01%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={params.commission_bps}
                onChange={(e) => setParams({ ...params, commission_bps: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
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
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Adverse Slippage (bps)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={params.slippage_bps}
                onChange={(e) => setParams({ ...params, slippage_bps: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="gap_slippage"
                checked={params.gap_slippage_enabled}
                onChange={(e) => setParams({ ...params, gap_slippage_enabled: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500"
              />
              <label htmlFor="gap_slippage" className="text-xs text-slate-300">
                Enable Gap-Down Stop Loss Penalization
              </label>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Dna size={15} className="text-rose-400" /> Dynamic Volatility Position Sizing
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Risk Fraction Per Trade (% Equity)</label>
              <input
                type="number"
                step="0.005"
                min="0.001"
                max="0.2"
                value={params.risk_fraction}
                onChange={(e) => setParams({ ...params, risk_fraction: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-rose-400 mb-1">Stop-Loss ATR Multiplier ($k_{SL}$)</label>
              <input
                type="number"
                step="0.1"
                value={params.atr_multiplier_sl}
                onChange={(e) => setParams({ ...params, atr_multiplier_sl: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-emerald-400 mb-1">Take-Profit ATR Multiplier ($k_{TP}$)</label>
              <input
                type="number"
                step="0.1"
                value={params.atr_multiplier_tp}
                onChange={(e) => setParams({ ...params, atr_multiplier_tp: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-rose-400 text-xs font-mono bg-rose-950/40 p-3 rounded-lg border border-rose-900">{error}</p>}
    </div>
  );
};