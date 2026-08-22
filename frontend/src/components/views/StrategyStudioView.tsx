// frontend/src/components/views/StrategyStudioView.tsx
import React, { useState } from 'react';
import axios from 'axios';
import {
  Sliders,
  Dna,
  Save,
  Trash2,
  Plus,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Info,
  X,
  FileText,
  Shield,
  Clock,
} from 'lucide-react';
import { useBacktest } from '../../context/BacktestContext';
import type { StrategyMetadata, StrategyPreset, StrategyRule } from '../../types';

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

type InfoModalTarget =
  | { type: 'strategy'; data: StrategyMetadata }
  | { type: 'preset'; data: StrategyPreset }
  | null;

export const StrategyStudioView: React.FC = () => {
  const {
    params,
    setParams,
    strategies,
    presets,
    selectedPreset,
    applyPreset,
    reloadPresets,
    error,
  } = useBacktest();

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'builder' | 'frictions'>('catalog');
  const [newPresetName, setNewPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [infoTarget, setInfoTarget] = useState<InfoModalTarget>(null);

  const [entryRules, setEntryRules] = useState<StrategyRule[]>([
    { id: '1', indicator_a: 'close', operator: '>', indicator_b: 'ema_fast' },
    { id: '2', indicator_a: 'rsi', operator: '<', threshold: 70 },
  ]);

  const [exitRules, setExitRules] = useState<StrategyRule[]>([
    { id: '1', indicator_a: 'close', operator: '<', indicator_b: 'ema_slow' },
  ]);

  const handleSelectBaseStrategy = (strat: StrategyMetadata) => {
    applyPreset('');
    const defaults: Record<string, any> = {};
    strat.parameters.forEach((p) => {
      defaults[p.name] = p.default;
    });

    setParams((prev) => ({
      ...prev,
      strategy_id: strat.id,
      strategy_params: defaults,
    }));
  };

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
    setParams((prev) => ({
      ...prev,
      strategy_id: 'custom_rule_strategy',
      strategy_params: {
        ...prev.strategy_params,
        entry_rules: entryRules,
        exit_rules: exitRules,
      },
    }));
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
      {/* Studio Sub-Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('catalog')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              activeSubTab === 'catalog' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Strategy Catalog ({presets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('builder')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
              activeSubTab === 'builder' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} /> Rule Constructor
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('frictions')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              activeSubTab === 'frictions' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Frictions & Sizing
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Selected Model: <span className="text-emerald-400 font-bold font-mono">{selectedPreset || params.strategy_id}</span>
        </div>
      </div>

      {/* SUB-VIEW 1: Strategy Catalog */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="text-emerald-400" size={16} /> Strategy Architectures & User Library
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click a card to select it, or click the info icon to inspect its mathematical definition and parameters.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setParams((p) => ({ ...p, strategy_id: 'custom_rule_strategy' }));
                setActiveSubTab('builder');
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md"
            >
              <Plus size={14} /> New Custom Strategy
            </button>
          </div>

          {/* Standard Base Templates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Standard Base Templates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategies.map((strat) => {
                const isSelected = params.strategy_id === strat.id && !selectedPreset;
                return (
                  <div
                    key={strat.id}
                    onClick={() => handleSelectBaseStrategy(strat)}
                    className={`p-5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white">{strat.name}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Inspect strategy parameters & formula"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoTarget({ type: 'strategy', data: strat });
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                          >
                            <Info size={15} />
                          </button>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            {strat.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {strat.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono">{strat.parameters.length} Parameters</span>
                      <span className={`font-semibold flex items-center gap-1 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isSelected ? 'Selected' : 'Select'} <ArrowRight size={12} />
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
              Custom Presets & Profiles ({presets.length})
            </h3>
            {presets.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                <p className="text-sm">No custom strategy profiles saved yet.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Design rules in the constructor and save them to build your portfolio.
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
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Inspect preset specifications"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInfoTarget({ type: 'preset', data: preset });
                              }}
                              className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition"
                            >
                              <Info size={15} />
                            </button>
                            <button
                              type="button"
                              title="Delete preset"
                              onClick={(e) => handleDeletePreset(preset.preset_name, e)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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
                  <Sparkles className="text-indigo-400" size={16} /> Signal Condition Builder
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Combine technical indicators and price levels into execution logic.
                </p>
              </div>

              <button
                type="button"
                onClick={handleApplyRulesToEngine}
                className="text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md"
              >
                Apply Rules to Active State
              </button>
            </div>

            {/* Entry Conditions */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Entry Trigger Rules (All conditions must be satisfied to enter LONG)
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
              <Save size={15} className="text-amber-400" /> Save Logic as Persistent Preset
            </h3>
            <form onSubmit={handleSavePreset} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. BTC Breakout+RSI Filter"
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
                  placeholder="e.g. Filtered breakout using RSI"
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
                  Save Preset
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

      {/* STRATEGY & PRESET SPECIFICATION MODAL */}
      {infoTarget && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {infoTarget.type === 'strategy' ? infoTarget.data.name : infoTarget.data.preset_name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 uppercase">
                    {infoTarget.type === 'strategy' ? infoTarget.data.category : `Preset: ${infoTarget.data.strategy_id}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  ID: {infoTarget.type === 'strategy' ? infoTarget.data.id : infoTarget.data.preset_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInfoTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Description Block */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <FileText size={13} className="text-indigo-400" /> Mathematical & Behavioral Thesis
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {infoTarget.type === 'strategy'
                  ? infoTarget.data.description
                  : infoTarget.data.description || 'No custom notes provided for this preset profile.'}
              </p>
            </div>

            {/* Parameters Breakdown Table (Base Strategy) */}
            {infoTarget.type === 'strategy' && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Sliders size={13} className="text-emerald-400" /> Parameter Schema Definitions
                </span>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Parameter</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Default</th>
                        <th className="p-2.5">Range</th>
                        <th className="p-2.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                      {infoTarget.data.parameters.map((p) => (
                        <tr key={p.name} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-sans font-semibold text-white">{p.label}</td>
                          <td className="p-2.5 text-indigo-400">{p.param_type}</td>
                          <td className="p-2.5 text-emerald-400">{String(p.default)}</td>
                          <td className="p-2.5 text-slate-400">
                            {p.min_value !== undefined ? `${p.min_value} - ${p.max_value}` : '—'}
                          </td>
                          <td className="p-2.5 font-sans text-slate-400">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Preset Specifications Breakdown */}
            {infoTarget.type === 'preset' && (
              <div className="space-y-4">
                {/* Custom AST Rules (if defined) */}
                {infoTarget.data.strategy_params.entry_rules && (
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                      Configured Entry Rules (All must be TRUE)
                    </span>
                    <div className="space-y-1.5 font-mono text-xs">
                      {infoTarget.data.strategy_params.entry_rules.map((r: any, idx: number) => (
                        <div key={idx} className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-slate-300">
                          #{idx + 1}: <span className="text-emerald-400">{r.indicator_a}</span> {r.operator}{' '}
                          <span className="text-indigo-300">{r.threshold !== undefined ? r.threshold : r.indicator_b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk & Friction Profile */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Shield size={13} className="text-rose-400" /> Embedded Risk & Cost Parameters
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-sans block">Risk Fraction</span>
                      <span className="text-white font-bold">{(infoTarget.data.risk_fraction * 100).toFixed(1)}%</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-sans block">SL Multiplier</span>
                      <span className="text-rose-400 font-bold">{infoTarget.data.atr_multiplier_sl}x ATR</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-sans block">TP Multiplier</span>
                      <span className="text-emerald-400 font-bold">{infoTarget.data.atr_multiplier_tp}x ATR</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-sans block">Commissions</span>
                      <span className="text-amber-400 font-bold">{infoTarget.data.commission_bps} bps</span>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                {infoTarget.data.updated_at && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono pt-2">
                    <Clock size={12} /> Last updated: {infoTarget.data.updated_at}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};