// src/components/ControlPanel.tsx
import React, { memo } from 'react';
import { Play, Coins, Building2 } from 'lucide-react';
import type { BacktestParams } from '../types/backtest';

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

export const ControlPanel = memo(({ params, setParams, onSubmit, loading, error }: ControlPanelProps) => (
  <>
    <div className="flex flex-wrap gap-2 mb-4">
      {ASSET_PRESETS.map((preset) => (
        <button
          key={preset.symbol}
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
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-9 gap-3">
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

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Fast EMA</label>
          <input 
            type="number" 
            value={params.fast_ema} 
            onChange={(e) => setParams({ ...params, fast_ema: Number(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Slow EMA</label>
          <input 
            type="number" 
            value={params.slow_ema} 
            onChange={(e) => setParams({ ...params, slow_ema: Number(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>

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
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50 text-sm"
          >
            <Play size={15} /> {loading ? 'Simulating...' : 'Run'}
          </button>
        </div>
      </form>
      {error && <p className="text-rose-400 text-xs mt-3 font-mono">{error}</p>}
    </div>
  </>
));