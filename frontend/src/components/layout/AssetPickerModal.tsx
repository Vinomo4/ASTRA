// frontend/src/components/layout/AssetPickerModal.tsx
import React, { useState, useMemo } from 'react';
import { Search, X, Check, Coins, Building2, TrendingUp, DollarSign } from 'lucide-react';
import { ASSET_CATALOG, type AssetInfo, type AssetCategory } from '../../types';

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  onSelectAsset: (symbol: string) => void;
}

const CATEGORIES: ('All' | AssetCategory)[] = [
  'All',
  'Crypto',
  'US Equities',
  'Indices & ETFs',
  'Commodities & FX',
];

const getCategoryIcon = (category: AssetCategory) => {
  switch (category) {
    case 'Crypto':
      return <Coins size={14} className="text-amber-400" />;
    case 'US Equities':
      return <Building2 size={14} className="text-blue-400" />;
    case 'Indices & ETFs':
      return <TrendingUp size={14} className="text-emerald-400" />;
    case 'Commodities & FX':
      return <DollarSign size={14} className="text-purple-400" />;
  }
};

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({
  isOpen,
  onClose,
  selectedSymbol,
  onSelectAsset,
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | AssetCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = useMemo(() => {
    return ASSET_CATALOG.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Select Financial Instrument</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose an asset across crypto, equities, benchmark ETFs, and commodities.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticker symbol or company name (e.g. NVDA, Bitcoin, S&P 500)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            autoFocus
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1 rounded-lg border font-semibold transition ${
                activeCategory === cat
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Asset Cards Grid */}
        <div className="overflow-y-auto pr-1 space-y-2 flex-1">
          {filteredAssets.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No financial instruments matching "{searchQuery}"
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isSelected = selectedSymbol === asset.symbol;
              return (
                <div
                  key={asset.symbol}
                  onClick={() => {
                    onSelectAsset(asset.symbol);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      {getCategoryIcon(asset.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-mono text-white">{asset.symbol}</span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                          {asset.exchange}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{asset.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">
                      {asset.category}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                        <Check size={13} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};