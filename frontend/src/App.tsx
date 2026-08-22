// frontend/src/App.tsx
import React from 'react';
import { BacktestProvider, useBacktest } from './context/BacktestContext';
import { TopNavigation } from './components/layout/TopNavigation';
import { GlobalControlRibbon } from './components/layout/GlobalControlRibbon';
import { StrategyStudioView } from './components/views/StrategyStudioView';
import { PerformanceAuditView } from './components/views/PerformanceAuditView';
import { StressTestingView } from './components/views/StressTestingView';
import { WalkForwardView } from './components/views/WalkForwardView';

const WorkspaceRouter: React.FC = () => {
  const { activeTab } = useBacktest();

  return (
    <main className="space-y-6">
      {activeTab === 'studio' && <StrategyStudioView />}
      {activeTab === 'performance' && <PerformanceAuditView />}
      {activeTab === 'stress_testing' && <StressTestingView />}
      {activeTab === 'validation' && <WalkForwardView />}
      {activeTab === 'comparison' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <h3 className="text-base font-semibold text-white">Model Benchmark & Alpha Attribution Workspace</h3>
          <p className="text-xs text-slate-400 mt-2">Planned for next step.</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlobalControlRibbon />
          <WorkspaceRouter />
        </div>
      </div>
    </BacktestProvider>
  );
}