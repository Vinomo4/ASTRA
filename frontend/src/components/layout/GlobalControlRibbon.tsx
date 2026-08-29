// frontend/src/components/layout/GlobalControlRibbon.tsx
import { AlertCircle, Calendar, ChevronDown, DollarSign, Play, } from 'lucide-react';
import React, { useState } from 'react';
import { getDefaultDateRange, useBacktest } from '../../context/BacktestContext';
import { ASSET_CATALOG } from '../../types';
import { AssetPickerModal } from './AssetPickerModal';

type DurationOption = '1Y' | '2Y' | '3Y' | '5Y' | 'custom';

const DURATION_OPTIONS: { value: Exclude<DurationOption, 'custom'>; years: number; label: string }[] = [
  { value: '1Y', years: 1, label: '1 año' },
  { value: '2Y', years: 2, label: '2 años' },
  { value: '3Y', years: 3, label: '3 años' },
  { value: '5Y', years: 5, label: '5 años' },
];

const getActiveDuration = (startDate: string, endDate: string): DurationOption => {
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return 'custom';

  for (const years of [1, 2, 3, 5] as const) {
    const expectedStart = new Date(end);
    expectedStart.setUTCFullYear(expectedStart.getUTCFullYear() - years);
    if (expectedStart.toISOString().slice(0, 10) === startDate) return `${years}Y`;
  }

  return 'custom';
};

export const GlobalControlRibbon: React.FC = () => {
  const { params, setParams, runSimulation, loading, selectAsset, isDirty, lastRunParams } = useBacktest();
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const activeDuration = getActiveDuration(params.start_date, params.end_date);

  const currentAsset = ASSET_CATALOG.find((a) => a.symbol === params.symbol) || {
    symbol: params.symbol,
    name: params.symbol,
    category: 'Activo de mercado',
    exchange: 'Mercado',
  };

  const isDateStale =
    lastRunParams &&
    (params.start_date !== lastRunParams.start_date || params.end_date !== lastRunParams.end_date);

  const handleQuickDuration = (years: number) => {
    const { start_date, end_date } = getDefaultDateRange(years);

    setParams((prev) => ({
      ...prev,
      start_date,
      end_date,
    }));
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <div
        className={`rounded-xl p-3.5 mb-6 shadow-sm transition-all duration-200 border ${
          isDirty
            ? 'bg-slate-900/95 border-amber-500/60 ring-1 ring-amber-500/30'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Asset & Capital Selector */}
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

          {/* Date Window Controls & Status Accent */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Duration Chips */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {DURATION_OPTIONS.map(({ value, years, label }) => {
                const isActive = activeDuration === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleQuickDuration(years)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                      isActive
                        ? isDateStale
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Date Inputs with Dynamic Accent */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition border ${
                isDateStale
                  ? 'bg-amber-950/40 border-amber-500/70 text-amber-200'
                  : 'bg-slate-950 border-slate-800 text-white'
              }`}
            >
              <Calendar size={14} className={isDateStale ? 'text-amber-400' : 'text-indigo-400'} />
              <input
                type="date"
                aria-label="Fecha de inicio"
                value={params.start_date}
                onChange={(e) => handleDateChange('start_date', e.target.value)}
                className="bg-transparent focus:outline-none font-mono text-xs cursor-pointer text-white"
              />
              <span className={isDateStale ? 'text-amber-500' : 'text-slate-500'}>→</span>
              <input
                type="date"
                aria-label="Fecha de fin"
                value={params.end_date}
                onChange={(e) => handleDateChange('end_date', e.target.value)}
                className="bg-transparent focus:outline-none font-mono text-xs cursor-pointer text-white"
              />
              {isDateStale && (
                <span
                  title="El intervalo de fechas ha cambiado; haz clic en Ejecutar backtest para aplicarlo"
                  className="text-[10px] text-amber-400 font-bold bg-amber-950 border border-amber-800 px-1.5 py-0.5 rounded ml-1 flex items-center gap-1 font-mono"
                >
                  <AlertCircle size={10} /> Pendiente
                </span>
              )}
            </div>

            {/* Run Button with Dynamic Style */}
            <button
              type="button"
              onClick={() => runSimulation()}
              disabled={loading}
              className={`font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shadow-md ${
                isDirty
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
              }`}
            >
              <Play size={14} className={isDirty ? 'fill-slate-950' : ''} />
              {loading ? 'Simulando...' : isDirty ? 'Ejecutar para actualizar' : 'Ejecutar backtest'}
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