// src/App.tsx
import React from 'react';
import { BacktestProvider, useBacktest } from './context/BacktestContext';
import { TopNavigation } from './components/layout/TopNavigation';
import { StrategyStudioView } from './components/views/StrategyStudioView';
import { PerformanceAuditView } from './components/views/PerformanceAuditView';
import { StressTestingView } from './components/views/StressTestingView';

const WorkspaceRouter: React.FC = () => {
  const { activeTab } = useBacktest();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {activeTab === 'studio' && <StrategyStudioView />}
      {activeTab === 'performance' && <PerformanceAuditView />}
      {activeTab === 'stress_testing' && <StressTestingView />}
      {activeTab === 'validation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <h3 className="text-base font-semibold text-white">Walk-Forward & Out-of-Sample Validation</h3>
          <p className="text-xs text-slate-400 mt-2">Planned for Phase 6 (Filter 4 Robustness validation).</p>
        </div>
      )}
      {activeTab === 'comparison' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <h3 className="text-base font-semibold text-white">Model Benchmark & Alpha Attribution Workspace</h3>
          <p className="text-xs text-slate-400 mt-2">Planned for Phase 7 (Multi-Strategy Alpha Comparison).</p>
        </div>
      )}
    </main>
  );
};

export default function App() {
  return (
    <BacktestProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
        <TopNavigation />
        <WorkspaceRouter />
      </div>
    </BacktestProvider>
  );
}