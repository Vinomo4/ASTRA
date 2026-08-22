// src/components/layout/TopNavigation.tsx
import React from 'react';
import { Sliders, Activity, ShieldAlert, Cpu, GitCompare, Play } from 'lucide-react';
import { useBacktest, type WorkspaceTab } from '../../context/BacktestContext';

export const TopNavigation: React.FC = () => {
  const { activeTab, setActiveTab, runSimulation, loading, results, params } = useBacktest();

  const tabs: { id: WorkspaceTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'studio', label: 'Strategy Studio', icon: <Sliders size={15} /> },
    {
      id: 'performance',
      label: 'Performance Audit',
      icon: <Activity size={15} />,
      badge: results ? `${results.total_return_pct >= 0 ? '+' : ''}${results.total_return_pct.toFixed(1)}%` : undefined,
    },
    { id: 'stress_testing', label: 'Stress Testing & MC', icon: <ShieldAlert size={15} /> },
    { id: 'validation', label: 'Walk-Forward & OOS', icon: <Cpu size={15} /> },
    { id: 'comparison', label: 'Model Benchmark', icon: <GitCompare size={15} /> },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 border border-emerald-500/50 p-2 rounded-lg text-emerald-400 font-bold text-xs font-mono">
              UB
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                Quantitative Trading Platform <span className="text-slate-500 font-normal">|</span>
                <span className="text-emerald-400 font-mono text-xs">{params.symbol}</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">Master FinTech Algorithmic Engine</p>
            </div>
          </div>

          <nav className="flex space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      (results?.total_return_pct || 0) >= 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => runSimulation()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 shadow-md shadow-emerald-950"
          >
            <Play size={13} /> {loading ? 'Running...' : 'Execute Backtest'}
          </button>
        </div>
      </div>
    </header>
  );
};