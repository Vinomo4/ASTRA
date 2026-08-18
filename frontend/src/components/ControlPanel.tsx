// src/components/ControlPanel.tsx
import React, { memo, useState } from 'react';
import { Play, Coins, Building2, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
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

export const ControlPanel = memo(({ params, setParams, onSubmit, loading, error }: ControlPanelProps) => {
  const [showFrictions, setShowFrictions] = useState(false);

  return (
    <>
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
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-4">
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
          </div>

          <div className="border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setShowFrictions(!showFrictions)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition"
            >
              <Sliders size={14} /> Market Frictions & Cost Model
              {showFrictions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

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
          </div>
        </form>

        {error && <p className="text-rose-400 text-xs mt-3 font-mono">{error}</p>}
      </div>
    </>
  );
});