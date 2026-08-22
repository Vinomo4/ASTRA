// frontend/src/components/layout/TopNavigation.tsx
import React from 'react';
import { Sliders, Activity, ShieldAlert, Cpu, GitCompare } from 'lucide-react';
import { useBacktest, type WorkspaceTab } from '../../context/BacktestContext';

export const TopNavigation: React.FC = () => {
  const { activeTab, setActiveTab, results } = useBacktest();

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
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 mb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Platform Context */}
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/20 border border-emerald-500/50 px-2 py-1 rounded-lg text-emerald-400 font-bold text-xs font-mono">
              UB-TFM
            </div>
            <div>
              <h1 className="text-xs font-bold text-white">Algorithmic Trading & ML Bot Engine</h1>
            </div>
          </div>

          {/* Centered Workspace Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
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
        </div>
      </div>
    </header>
  );
};