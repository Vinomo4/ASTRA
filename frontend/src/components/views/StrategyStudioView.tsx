// frontend/src/components/views/StrategyStudioView.tsx
import axios from 'axios';
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    Dna,
    FileText,
    Info,
    Layers,
    Plus,
    Save,
    Shield,
    Sliders,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useBacktest } from '../../context/BacktestContext';
import type { StrategyMetadata, StrategyPreset, StrategyRule } from '../../types';

const AVAILABLE_INDICATORS = [
  { value: 'close', label: 'Precio de cierre' },
  { value: 'open', label: 'Precio de apertura' },
  { value: 'high', label: 'Precio máximo' },
  { value: 'low', label: 'Precio mínimo' },
  { value: 'ema_fast', label: 'EMA rápida' },
  { value: 'ema_slow', label: 'EMA lenta' },
  { value: 'rsi', label: 'Valor del RSI' },
  { value: 'donchian_high', label: 'Máximo del canal Donchian' },
  { value: 'donchian_low', label: 'Mínimo del canal Donchian' },
  { value: 'volume', label: 'Volumen' },
  { value: 'volume_ma', label: 'MA de volumen' },
];

type StrategyDisplayTranslation = {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, { label: string; description: string }>;
};

const STRATEGY_DISPLAY_TRANSLATIONS: Record<string, StrategyDisplayTranslation> = {
  trend_following_ema: {
    name: 'Seguimiento de tendencia con EMA',
    description:
      'Sistema de cruce de medias móviles exponenciales rápida y lenta con bandas de volatilidad ATR.',
    category: 'Basada en reglas',
    parameters: {
      fast_ema: {
        label: 'Período de EMA rápida',
        description: 'Período de la media móvil exponencial de corto plazo',
      },
      slow_ema: {
        label: 'Período de EMA lenta',
        description: 'Período de la media móvil exponencial de largo plazo',
      },
      atr_period: {
        label: 'Período del ATR',
        description: 'Período retrospectivo para calcular la volatilidad mediante ATR',
      },
    },
  },
  regime_volatility_breakout: {
    name: 'Ruptura de volatilidad filtrada por régimen',
    description:
      'Estrategia de ruptura Donchian filtrada por la fuerza de tendencia ADX y la expansión relativa del volumen, con bandas dinámicas de volatilidad ATR.',
    category: 'Basada en reglas',
    parameters: {
      channel_period: {
        label: 'Período del canal Donchian',
        description: 'Ventana retrospectiva para los límites máximo y mínimo de la ruptura',
      },
      adx_period: {
        label: 'Período del ADX',
        description: 'Ventana retrospectiva del índice direccional medio (ADX)',
      },
      adx_threshold: {
        label: 'Umbral del filtro de tendencia ADX',
        description: 'Valor mínimo del ADX necesario para confirmar un régimen de tendencia activo',
      },
      volume_ma_period: {
        label: 'Período retrospectivo de la MA de volumen',
        description: 'Período de la media móvil para comparar el volumen de referencia',
      },
      volume_multiplier: {
        label: 'Factor de expansión del volumen',
        description: 'Umbral de volumen relativo necesario para confirmar el impulso de la ruptura',
      },
      atr_period: {
        label: 'Período de volatilidad ATR',
        description: 'Período retrospectivo para calcular dinámicamente el Stop Loss y el Take Profit',
      },
    },
  },
  statistical_mean_reversion: {
    name: 'Reversión a la media con Z-Score',
    description:
      'Reversión estadística a la media basada en desviaciones estándar (Z-Score) y extremos del RSI de corto plazo, limitada por un filtro ADX de régimen sin tendencia.',
    category: 'Basada en reglas',
    parameters: {
      lookback_period: {
        label: 'Período retrospectivo del Z-Score',
        description: 'Ventana móvil para calcular la media de referencia y la desviación estándar',
      },
      z_entry_threshold: {
        label: 'Entrada LONG por Z-Score',
        description: 'Desviaciones estándar bajo la media necesarias para activar una entrada LONG por sobreventa',
      },
      z_exit_threshold: {
        label: 'Salida objetivo por Z-Score',
        description: 'Nivel de desviación estandarizada para tomar beneficios al revertir a la media',
      },
      rsi_period: {
        label: 'Período retrospectivo del RSI',
        description: 'Período del RSI de corto plazo, al estilo Connors, para confirmar una sobreventa extrema',
      },
      rsi_entry_threshold: {
        label: 'Umbral máximo del RSI',
        description: 'Valor máximo del RSI permitido para una entrada LONG que confirme capitulación',
      },
      adx_max_regime: {
        label: 'Límite máximo de régimen ADX',
        description: 'Fuerza de tendencia máxima permitida; bloquea operaciones durante tendencias direccionales fuertes',
      },
    },
  },
  ml_inference: {
    name: 'Inferencia ML Triple-Barrier',
    description: 'Genera señales de trading mediante predicciones calibradas fuera de muestra de un modelo de ML.',
    category: 'Aprendizaje automático',
    parameters: {
      model_path: {
        label: 'Ruta del artefacto del modelo',
        description: 'Ruta del sistema de archivos al artefacto joblib del modelo entrenado',
      },
      threshold_long: {
        label: 'Umbral de probabilidad LONG',
        description: 'Probabilidad mínima del modelo necesaria para activar una posición LONG',
      },
      threshold_exit: {
        label: 'Umbral de probabilidad de salida',
        description: 'Umbral de probabilidad por debajo del cual se cierra una posición activa',
      },
      lookback_window: {
        label: 'Ventana de calentamiento de variables',
        description: 'Búfer de barras históricas necesario para calcular indicadores estacionarios',
      },
    },
  },
  custom_rule_strategy: {
    name: 'Constructor de estrategias personalizado',
    description:
      'Estrategia multicondición definida por el usuario mediante indicadores técnicos dinámicos y reglas de comparación.',
    category: 'Basada en reglas',
    parameters: {
      fast_period: {
        label: 'Período rápido (EMA/SMA)',
        description: 'Período retrospectivo de la media móvil rápida',
      },
      slow_period: {
        label: 'Período lento (EMA/SMA)',
        description: 'Período retrospectivo de referencia de la media móvil lenta',
      },
      rsi_period: {
        label: 'Período del RSI',
        description: 'Período retrospectivo del índice de fuerza relativa (RSI)',
      },
    },
  },
};

const PARAMETER_TYPE_LABELS: Record<StrategyMetadata['parameters'][number]['param_type'], string> = {
  int: 'entero',
  float: 'decimal',
  bool: 'booleano',
  str: 'texto',
  select: 'selección',
};

const SPANISH_NUMBER_FORMATTER = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 20 });
const SPANISH_PERCENT_FORMATTER = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const SPANISH_DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });
const SPANISH_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const getStrategyName = (strategy: StrategyMetadata) =>
  STRATEGY_DISPLAY_TRANSLATIONS[strategy.id]?.name ?? strategy.name;

const getStrategyDescription = (strategy: StrategyMetadata) =>
  STRATEGY_DISPLAY_TRANSLATIONS[strategy.id]?.description ?? strategy.description;

const getStrategyCategory = (strategy: StrategyMetadata) =>
  STRATEGY_DISPLAY_TRANSLATIONS[strategy.id]?.category ?? strategy.category;

const getParameterTranslation = (strategyId: string, parameterName: string) =>
  STRATEGY_DISPLAY_TRANSLATIONS[strategyId]?.parameters[parameterName];

const getIndicatorLabel = (indicator: string | undefined) =>
  AVAILABLE_INDICATORS.find(({ value }) => value === indicator)?.label ?? indicator ?? '';

const formatMetadataValue = (value: unknown) => {
  if (typeof value === 'number') return SPANISH_NUMBER_FORMATTER.format(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
};

const formatTimestamp = (value: string | undefined, includeTime = false) => {
  if (!value) return 'Fecha no disponible';

  const parsedDate = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsedDate.getTime())) return value;

  return (includeTime ? SPANISH_DATE_TIME_FORMATTER : SPANISH_DATE_FORMATTER).format(parsedDate);
};

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
  const selectedStrategy = strategies.find((strategy) => strategy.id === params.strategy_id);
  const selectedModelLabel = selectedPreset || (selectedStrategy ? getStrategyName(selectedStrategy) : params.strategy_id);

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
    if (!window.confirm(`¿Eliminar el preajuste de estrategia "${name}"?`)) return;

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
            Catálogo de estrategias ({SPANISH_NUMBER_FORMATTER.format(presets.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('builder')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
              activeSubTab === 'builder' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} /> Constructor de estrategias
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('frictions')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              activeSubTab === 'frictions' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Fricciones y dimensionamiento
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Modelo seleccionado: <span className="text-emerald-400 font-bold font-mono">{selectedModelLabel}</span>
        </div>
      </div>

      {/* SUB-VIEW 1: Strategy Catalog */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="text-emerald-400" size={16} /> Estrategias disponibles y biblioteca del usuario
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Haz clic en una tarjeta para seleccionarla o en el icono de información para consultar su definición matemática y sus parámetros.
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
              <Plus size={14} /> Nueva estrategia personalizada
            </button>
          </div>

          {/* Standard Base Templates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Plantillas base estándar
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
                        <span className="font-bold text-sm text-white">{getStrategyName(strat)}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Consultar parámetros y fórmula de la estrategia"
                            aria-label={`Consultar parámetros y fórmula de ${getStrategyName(strat)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoTarget({ type: 'strategy', data: strat });
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                          >
                            <Info size={15} />
                          </button>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            {getStrategyCategory(strat)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {getStrategyDescription(strat)}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono">
                        {SPANISH_NUMBER_FORMATTER.format(strat.parameters.length)} parámetros
                      </span>
                      <span className={`font-semibold flex items-center gap-1 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isSelected ? 'Seleccionada' : 'Seleccionar'} <ArrowRight size={12} />
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
              Preajustes y perfiles personalizados ({SPANISH_NUMBER_FORMATTER.format(presets.length)})
            </h3>
            {presets.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                <p className="text-sm">Aún no hay perfiles de estrategia personalizados guardados.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Diseña reglas en el constructor y guárdalas para crear tu cartera.
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
                              title="Consultar especificaciones del preajuste"
                              aria-label={`Consultar especificaciones del preajuste ${preset.preset_name}`}
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
                              title="Eliminar preajuste"
                              aria-label={`Eliminar el preajuste ${preset.preset_name}`}
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
                          {preset.description || 'No se ha proporcionado ninguna descripción.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-mono text-[11px]">{formatTimestamp(preset.updated_at)}</span>
                        <span className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                          {isSelected ? 'Cargado' : 'Cargar preajuste'}
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
                  <Sparkles className="text-indigo-400" size={16} /> Constructor de condiciones de señal
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Combina indicadores técnicos y niveles de precio para crear lógica de ejecución.
                </p>
              </div>

              <button
                type="button"
                onClick={handleApplyRulesToEngine}
                className="text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md"
              >
                Aplicar reglas al estado activo
              </button>
            </div>

            {/* Entry Conditions */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Reglas de activación de entrada (deben cumplirse todas para abrir una posición LONG)
                </span>
                <button
                  type="button"
                  onClick={handleAddEntryRule}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Plus size={13} /> Añadir condición
                </button>
              </div>

              <div className="space-y-2.5">
                {entryRules.map((rule, idx) => (
                  <div key={rule.id} className="flex flex-wrap items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>

                    <select
                      value={rule.indicator_a}
                      aria-label={`Indicador izquierdo de la condición de entrada ${idx + 1}`}
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
                      aria-label={`Operador de la condición de entrada ${idx + 1}`}
                      onChange={(e) => {
                        const updated = [...entryRules];
                        updated[idx].operator = e.target.value as any;
                        setEntryRules(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-bold rounded-lg px-2 py-1.5 focus:outline-none"
                    >
                      <option value=">">&gt; Mayor que</option>
                      <option value="<">&lt; Menor que</option>
                      <option value=">=">&gt;= Mayor o igual que</option>
                      <option value="<=">&lt;= Menor o igual que</option>
                      <option value="==">== Igual a</option>
                    </select>

                    <select
                      value={rule.indicator_b || 'static'}
                      aria-label={`Comparador de la condición de entrada ${idx + 1}`}
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
                      <option value="static">Valor numérico fijo</option>
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
                        aria-label={`Valor numérico de la condición de entrada ${idx + 1}`}
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
                        title="Eliminar condición de entrada"
                        aria-label={`Eliminar la condición de entrada ${idx + 1}`}
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
                  Reglas de activación de salida (cualquier condición provoca una salida a mercado)
                </span>
                <button
                  type="button"
                  onClick={handleAddExitRule}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Plus size={13} /> Añadir condición
                </button>
              </div>

              <div className="space-y-2.5">
                {exitRules.map((rule, idx) => (
                  <div key={rule.id} className="flex flex-wrap items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>

                    <select
                      value={rule.indicator_a}
                      aria-label={`Indicador izquierdo de la condición de salida ${idx + 1}`}
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
                      aria-label={`Operador de la condición de salida ${idx + 1}`}
                      onChange={(e) => {
                        const updated = [...exitRules];
                        updated[idx].operator = e.target.value as any;
                        setExitRules(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-rose-400 font-bold rounded-lg px-2 py-1.5 focus:outline-none"
                    >
                      <option value=">">&gt; Mayor que</option>
                      <option value="<">&lt; Menor que</option>
                      <option value=">=">&gt;= Mayor o igual que</option>
                      <option value="<=">&lt;= Menor o igual que</option>
                    </select>

                    <select
                      value={rule.indicator_b || 'static'}
                      aria-label={`Comparador de la condición de salida ${idx + 1}`}
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
                      <option value="static">Valor numérico fijo</option>
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
                        aria-label={`Valor numérico de la condición de salida ${idx + 1}`}
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
                        title="Eliminar condición de salida"
                        aria-label={`Eliminar la condición de salida ${idx + 1}`}
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
              <Save size={15} className="text-amber-400" /> Guardar lógica como preajuste persistente
            </h3>
            <form onSubmit={handleSavePreset} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del preajuste</label>
                <input
                  type="text"
                  placeholder="p. ej., ruptura de BTC + filtro RSI"
                  required
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="p. ej., ruptura filtrada mediante RSI"
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
                  Guardar preajuste
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 size={14} /> ¡Guardado!
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
              <Sliders size={15} className="text-indigo-400" /> Fricciones de mercado y modelo de costes del bróker
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Comisión (bps) (1 bps = 0,01 %)</label>
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
              <label className="block text-xs text-slate-400 mb-1">Tarifa fija ($/orden)</label>
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
              <label className="block text-xs text-slate-400 mb-1">Slippage adverso (bps)</label>
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
                Activar penalización del Stop Loss por gap bajista
              </label>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Dna size={15} className="text-rose-400" /> Dimensionamiento dinámico de posiciones por volatilidad
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Fracción de riesgo por operación (% del capital)</label>
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
              <label className="block text-xs text-rose-400 mb-1">Multiplicador ATR del Stop Loss ({'$k_{SL}$'})</label>
              <input
                type="number"
                step="0.1"
                value={params.atr_multiplier_sl}
                onChange={(e) => setParams({ ...params, atr_multiplier_sl: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-emerald-400 mb-1">Multiplicador ATR del Take Profit ({'$k_{TP}$'})</label>
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
                    {infoTarget.type === 'strategy' ? getStrategyName(infoTarget.data) : infoTarget.data.preset_name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 uppercase">
                    {infoTarget.type === 'strategy'
                      ? getStrategyCategory(infoTarget.data)
                      : `Preajuste: ${infoTarget.data.strategy_id}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  ID: {infoTarget.type === 'strategy' ? infoTarget.data.id : infoTarget.data.preset_name}
                </p>
              </div>

              <button
                type="button"
                title="Cerrar detalles"
                aria-label="Cerrar detalles de la estrategia"
                onClick={() => setInfoTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Description Block */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <FileText size={13} className="text-indigo-400" /> Tesis matemática y de comportamiento
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {infoTarget.type === 'strategy'
                  ? getStrategyDescription(infoTarget.data)
                  : infoTarget.data.description || 'No se han añadido notas personalizadas a este perfil.'}
              </p>
            </div>

            {/* Parameters Breakdown Table (Base Strategy) */}
            {infoTarget.type === 'strategy' && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Sliders size={13} className="text-emerald-400" /> Definiciones del esquema de parámetros
                </span>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Parámetro</th>
                        <th className="p-2.5">Tipo</th>
                        <th className="p-2.5">Predeterminado</th>
                        <th className="p-2.5">Rango</th>
                        <th className="p-2.5">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                      {infoTarget.data.parameters.map((p) => {
                        const parameterTranslation = getParameterTranslation(infoTarget.data.id, p.name);
                        return (
                          <tr key={p.name} className="hover:bg-slate-800/30">
                            <td className="p-2.5 font-sans font-semibold text-white">
                              {parameterTranslation?.label ?? p.label}
                            </td>
                            <td className="p-2.5 text-indigo-400">{PARAMETER_TYPE_LABELS[p.param_type]}</td>
                            <td className="p-2.5 text-emerald-400">{formatMetadataValue(p.default)}</td>
                            <td className="p-2.5 text-slate-400">
                              {p.min_value !== undefined
                                ? `${SPANISH_NUMBER_FORMATTER.format(p.min_value)} - ${SPANISH_NUMBER_FORMATTER.format(p.max_value ?? p.min_value)}`
                                : '—'}
                            </td>
                            <td className="p-2.5 font-sans text-slate-400">
                              {parameterTranslation?.description ?? p.description}
                            </td>
                          </tr>
                        );
                      })}
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
                      Reglas de entrada configuradas (todas deben ser verdaderas)
                    </span>
                    <div className="space-y-1.5 font-mono text-xs">
                      {infoTarget.data.strategy_params.entry_rules.map((r: any, idx: number) => (
                        <div key={idx} className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-slate-300">
                          #{SPANISH_NUMBER_FORMATTER.format(idx + 1)}:{' '}
                          <span className="text-emerald-400">{getIndicatorLabel(r.indicator_a)}</span> {r.operator}{' '}
                          <span className="text-indigo-300">
                            {r.threshold !== undefined
                              ? SPANISH_NUMBER_FORMATTER.format(r.threshold)
                              : getIndicatorLabel(r.indicator_b)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk & Friction Profile */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Shield size={13} className="text-rose-400" /> Parámetros de riesgo y costes incorporados
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-sans block">Fracción de riesgo</span>
                      <span className="text-white font-bold">
                        {SPANISH_PERCENT_FORMATTER.format(infoTarget.data.risk_fraction * 100)} %
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-sans block">Multiplicador de SL</span>
                      <span className="text-rose-400 font-bold">
                        {SPANISH_NUMBER_FORMATTER.format(infoTarget.data.atr_multiplier_sl)}x ATR
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-sans block">Multiplicador de TP</span>
                      <span className="text-emerald-400 font-bold">
                        {SPANISH_NUMBER_FORMATTER.format(infoTarget.data.atr_multiplier_tp)}x ATR
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-sans block">Comisiones</span>
                      <span className="text-amber-400 font-bold">
                        {SPANISH_NUMBER_FORMATTER.format(infoTarget.data.commission_bps)} bps
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                {infoTarget.data.updated_at && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono pt-2">
                    <Clock size={12} /> Última actualización: {formatTimestamp(infoTarget.data.updated_at, true)}
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