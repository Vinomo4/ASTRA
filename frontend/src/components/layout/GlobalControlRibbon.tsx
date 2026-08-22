// frontend/src/components/layout/GlobalControlRibbon.tsx
import React, { useState } from 'react';
import { Calendar, ChevronDown, Play, DollarSign } from 'lucide-react';
import { useBacktest, getDefaultDateRange } from '../../context/BacktestContext';
import { AssetPickerModal } from './AssetPickerModal';
import { ASSET_CATALOG } from '../../types/backtest';

type DurationOption = '1Y' | '2Y' | '3Y' | '5Y' | 'custom';

export const GlobalControlRibbon: React.FC = () => {
  const { params, setParams, runSimulation, loading, selectAsset } = useBacktest();
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [activeDuration, setActiveDuration] = useState<DurationOption>('2Y');

  const currentAsset = ASSET_CATALOG.find((a) => a.symbol === params.symbol) || {
    symbol: params.symbol,
    name: params.symbol,
    category: 'Market Asset',
    exchange: 'Exchange',
  };

  const handleQuickDuration = (years: number, label: DurationOption) => {
    setActiveDuration(label);
    const { start_date, end_date } = getDefaultDateRange(years);

    // Only update parameters in state — do not trigger simulation automatically
    setParams((prev) => ({
      ...prev,
      start_date,
      end_date,
    }));
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    setActiveDuration('custom');
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Asset Selector & Capital */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAssetModalOpen(true)}
              className="flex items-center gap-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl transition text-left group"
            >
              <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg font-mono text-xs font-bold">
                {currentAsset.symbol.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white font-mono">{currentAsset.symbol}</span>
                  <ChevronDown size={14} className="text-slate-400 group-hover:text-white transition" />
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[130px]">{currentAsset.name}</p>
              </div>
            </button>

            {/* Capital Input */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
              <DollarSign size={15} className="text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-500 block leading-tight">CAPITAL</span>
                <input
                  type="number"
                  step="5000"
                  value={params.initial_capital}
                  onChange={(e) => setParams({ ...params, initial_capital: Number(e.target.value) })}
                  className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none w-20"
                />
              </div>
            </div>
          </div>

          {/* Interactive Date Range & Duration Chips */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Duration Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['1Y', '2Y', '3Y', '5Y'] as const).map((label) => {
                const years = parseInt(label.replace('Y', ''), 10);
                const isActive = activeDuration === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleQuickDuration(years, label)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                      isActive
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <Calendar size={14} className="text-indigo-400" />
              <input
                type="date"
                value={params.start_date}
                onChange={(e) => handleDateChange('start_date', e.target.value)}
                className="bg-transparent text-white focus:outline-none font-mono text-xs cursor-pointer"
              />
              <span className="text-slate-500">→</span>
              <input
                type="date"
                value={params.end_date}
                onChange={(e) => handleDateChange('end_date', e.target.value)}
                className="bg-transparent text-white focus:outline-none font-mono text-xs cursor-pointer"
              />
            </div>

            {/* Manual Run Backtest Trigger */}
            <button
              type="button"
              onClick={() => runSimulation()}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-emerald-950"
            >
              <Play size={14} /> {loading ? 'Simulating...' : 'Run Backtest'}
            </button>
          </div>
        </div>
      </div>

      <AssetPickerModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        selectedSymbol={params.symbol}
        onSelectAsset={selectAsset}
      />
    </>
  );
};