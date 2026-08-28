// frontend/src/context/BacktestContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import type { BacktestParams, BacktestResult, StrategyMetadata, StrategyPreset } from '../types';

export type WorkspaceTab = 'studio' | 'performance' | 'stress_testing' | 'validation' | 'comparison';

// Genera un rango dinámico desde hace N años hasta el día de hoy
export const getDefaultDateRange = (years: number = 3) => {
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - years);
  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0],
  };
};

interface BacktestContextType {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  params: BacktestParams;
  setParams: React.Dispatch<React.SetStateAction<BacktestParams>>;
  lastRunParams: BacktestParams | null;
  isDirty: boolean;
  results: BacktestResult | null;
  loading: boolean;
  error: string | null;
  strategies: StrategyMetadata[];
  presets: StrategyPreset[];
  selectedPreset: string;
  runSimulation: (overrideParams?: BacktestParams, forceRefresh?: boolean) => Promise<void>;
  selectAsset: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
  applyPreset: (presetName: string) => void;
  reloadPresets: () => Promise<void>;
  setAcademicBenchmarkDates: () => void;
}

const BacktestContext = createContext<BacktestContextType | null>(null);

const getCacheKey = (p: BacktestParams): string => {
  return [
    p.symbol,
    p.timeframe || '4h',
    p.start_date,
    p.end_date,
    p.strategy_id,
    p.initial_capital,
    p.risk_fraction,
    p.atr_multiplier_sl,
    p.atr_multiplier_tp,
    p.commission_bps,
    p.commission_fixed,
    p.slippage_bps,
    p.gap_slippage_enabled,
    p.num_simulations,
    p.ruin_threshold_pct,
    JSON.stringify(p.strategy_params || {}),
  ].join('|');
};

export const BacktestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [strategies, setStrategies] = useState<StrategyMetadata[]>([]);
  const [presets, setPresets] = useState<StrategyPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const defaultDates = getDefaultDateRange(3);

  const [params, setParams] = useState<BacktestParams>({
    symbol: 'BTC-USD',
    timeframe: '4h',
    start_date: defaultDates.start_date,
    end_date: defaultDates.end_date,
    initial_capital: 100000,
    strategy_id: 'regime_volatility_breakout',
    strategy_params: {
      channel_period: 20,
      adx_period: 14,
      adx_threshold: 25.0,
      volume_ma_period: 20,
      volume_multiplier: 1.2,
      atr_period: 14,
    },
    risk_fraction: 0.01,
    atr_multiplier_sl: 2.0,
    atr_multiplier_tp: 4.0,
    commission_bps: 5.0,
    commission_fixed: 0.0,
    slippage_bps: 2.0,
    gap_slippage_enabled: true,
    num_simulations: 1000,
    ruin_threshold_pct: 30.0,
  });

  const [lastRunParams, setLastRunParams] = useState<BacktestParams | null>(null);
  const resultsCache = useRef<Map<string, BacktestResult>>(new Map());
  const hasAutoInitialized = useRef(false);

  const isDirty = useMemo(() => {
    if (!lastRunParams) return false;
    return (
      params.symbol !== lastRunParams.symbol ||
      params.timeframe !== lastRunParams.timeframe ||
      params.start_date !== lastRunParams.start_date ||
      params.end_date !== lastRunParams.end_date ||
      params.strategy_id !== lastRunParams.strategy_id ||
      params.initial_capital !== lastRunParams.initial_capital ||
      JSON.stringify(params.strategy_params) !== JSON.stringify(lastRunParams.strategy_params)
    );
  }, [params, lastRunParams]);

  const setAcademicBenchmarkDates = () => {
    setParams((prev) => ({
      ...prev,
      start_date: '2022-01-01',
      end_date: '2025-12-31',
    }));
  };

  const runSimulation = useCallback(
    async (overrideParams?: BacktestParams, forceRefresh: boolean = false) => {
      const activeParams = overrideParams || params;
      const cacheKey = getCacheKey(activeParams);

      if (!forceRefresh && resultsCache.current.has(cacheKey)) {
        const cached = resultsCache.current.get(cacheKey)!;
        setResults(cached);
        setLastRunParams(JSON.parse(JSON.stringify(activeParams)));
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await axios.post('http://127.0.0.1:8000/api/backtest/run', activeParams);
        const data = response.data;
        resultsCache.current.set(cacheKey, data);
        setResults(data);
        setLastRunParams(JSON.parse(JSON.stringify(activeParams)));
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          const formatted = detail
            .map((d: any) => `${d.loc?.filter((l: string) => l !== 'body').join('.') || 'Error'}: ${d.msg}`)
            .join(' | ');
          setError(formatted);
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError(err.message || 'Backtest simulation failed');
        }
      } finally {
        setLoading(false);
      }
    },
    [params]
  );

  const loadMetadata = useCallback(async () => {
    try {
      const [stratRes, presetRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/backtest/strategies'),
        axios.get('http://127.0.0.1:8000/api/backtest/presets'),
      ]);
      setStrategies(stratRes.data.strategies || []);
      setPresets(presetRes.data.presets || []);

      if (!hasAutoInitialized.current) {
        hasAutoInitialized.current = true;
        runSimulation();
      }
    } catch (err) {
      console.error('Failed to load strategies or presets:', err);
    }
  }, [runSimulation]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const selectAsset = (symbol: string) => {
    setParams((prev) => ({ ...prev, symbol }));
  };

  const setTimeframe = (timeframe: string) => {
    setParams((prev) => ({ ...prev, timeframe }));
  };

  const applyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
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

  return (
    <BacktestContext.Provider
      value={{
        activeTab,
        setActiveTab,
        params,
        setParams,
        lastRunParams,
        isDirty,
        results,
        loading,
        error,
        strategies,
        presets,
        selectedPreset,
        runSimulation,
        selectAsset,
        setTimeframe,
        applyPreset,
        reloadPresets: loadMetadata,
        setAcademicBenchmarkDates,
      }}
    >
      {children}
    </BacktestContext.Provider>
  );
};

export const useBacktest = () => {
  const ctx = useContext(BacktestContext);
  if (!ctx) throw new Error('useBacktest must be used within a BacktestProvider');
  return ctx;
};