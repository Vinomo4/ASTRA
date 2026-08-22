// frontend/src/context/BacktestContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { BacktestParams, BacktestResult, StrategyMetadata, StrategyPreset } from '../types/backtest';

export type WorkspaceTab = 'studio' | 'performance' | 'stress_testing' | 'validation' | 'comparison';

interface BacktestContextType {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  params: BacktestParams;
  setParams: React.Dispatch<React.SetStateAction<BacktestParams>>;
  results: BacktestResult | null;
  loading: boolean;
  error: string | null;
  strategies: StrategyMetadata[];
  presets: StrategyPreset[];
  selectedPreset: string;
  runSimulation: (overrideParams?: BacktestParams) => Promise<void>;
  selectAsset: (symbol: string) => void;
  applyPreset: (presetName: string) => void;
  reloadPresets: () => Promise<void>;
}

const BacktestContext = createContext<BacktestContextType | null>(null);

export const BacktestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('performance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [strategies, setStrategies] = useState<StrategyMetadata[]>([]);
  const [presets, setPresets] = useState<StrategyPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const [params, setParams] = useState<BacktestParams>({
    symbol: 'BTC-USD',
    start_date: '2023-01-01',
    end_date: '2024-01-01',
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

  const hasAutoInitialized = useRef(false);

  const runSimulation = useCallback(async (overrideParams?: BacktestParams) => {
    const activeParams = overrideParams || params;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/backtest/run', activeParams);
      setResults(response.data);
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
  }, [params]);

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
    const updated = { ...params, symbol };
    setParams(updated);
    runSimulation(updated);
  };

  const applyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    if (!presetName) return;

    const p = presets.find((item) => item.preset_name === presetName);
    if (!p) return;

    const updated: BacktestParams = {
      ...params,
      strategy_id: p.strategy_id,
      strategy_params: { ...p.strategy_params },
      risk_fraction: p.risk_fraction,
      atr_multiplier_sl: p.atr_multiplier_sl,
      atr_multiplier_tp: p.atr_multiplier_tp,
      commission_bps: p.commission_bps,
      commission_fixed: p.commission_fixed,
      slippage_bps: p.slippage_bps,
      gap_slippage_enabled: p.gap_slippage_enabled,
    };
    setParams(updated);
    runSimulation(updated);
  };

  return (
    <BacktestContext.Provider
      value={{
        activeTab,
        setActiveTab,
        params,
        setParams,
        results,
        loading,
        error,
        strategies,
        presets,
        selectedPreset,
        runSimulation,
        selectAsset,
        applyPreset,
        reloadPresets: loadMetadata,
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