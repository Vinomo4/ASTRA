// src/components/views/StressTestingView.tsx
import { AlertCircle } from 'lucide-react';
import React from 'react';
import { useBacktest } from '../../context/BacktestContext';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { MonteCarloPanel } from '../MonteCarloPanel';

export const StressTestingView: React.FC = () => {
  const { results, setActiveTab } = useBacktest();

  if (!results || !results.monte_carlo) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <AlertCircle size={36} className="mx-auto mb-3 text-slate-500" />
        <p className="font-semibold text-slate-200">
          No hay ninguna simulación de Monte Carlo disponible
        </p>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Ejecuta una simulación retrospectiva desde el Registro de estrategias con suficientes
          operaciones cerradas (N ≥ 3).
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
        >
          Abrir Registro de estrategias
        </button>
      </div>
    );
  }

  const mc = results.monte_carlo;

  return (
    <div className="space-y-6">
      {/* Top Statistical Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Simulaciones bootstrap
          </span>
          <p className="text-2xl font-bold text-white mt-1 font-mono">
            {formatNumber(mc.num_simulations, 0, 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Sobre {formatNumber(mc.trade_count, 0, 0)} operaciones empíricas
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Riesgo de ruina (barrera)
          </span>
          <p className={`text-2xl font-bold mt-1 font-mono ${mc.risk_of_ruin_pct > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatPercent(mc.risk_of_ruin_pct, false, 1)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Umbral de ruina fijado en un drawdown máx. del{' '}
            {formatPercent(mc.ruin_threshold_pct, false, 0)}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Valor en riesgo (VaR) al 99 %
          </span>
          <p className="text-2xl font-bold text-amber-400 mt-1 font-mono">
            {formatPercent(mc.var_99_pct, false, 2)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Pérdida del percentil 99 % por operación
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Déficit esperado (CVaR) al 99 %
          </span>
          <p className="text-2xl font-bold text-rose-500 mt-1 font-mono">
            {formatPercent(mc.cvar_99_pct, false, 2)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Pérdida media en el peor 1 % de la cola
          </p>
        </div>
      </div>

      {/* Main Monte Carlo Fan Chart Component */}
      <MonteCarloPanel monteCarlo={mc} />
    </div>
  );
};