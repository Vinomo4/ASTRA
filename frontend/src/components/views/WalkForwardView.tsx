// frontend/src/components/views/WalkForwardView.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ShieldCheck, Cpu, Play, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useBacktest } from '../../context/BacktestContext';
import type { WalkForwardResponse } from '../../types';

export const WalkForwardView: React.FC = () => {
  const { params } = useBacktest();
  const [trainRatio, setTrainRatio] = useState<number>(0.70);
  const [wfData, setWfData] = useState<WalkForwardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runValidation = async (ratio: number = trainRatio) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...params,
        train_ratio: ratio,
      };
      const res = await axios.post<WalkForwardResponse>('http://127.0.0.1:8000/api/backtest/walk-forward', payload);
      setWfData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runValidation(trainRatio);
  }, [params.symbol, params.strategy_id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ROBUST':
        return (
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 size={14} /> ROBUST (Low Overfitting)
          </span>
        );
      case 'MODERATE':
        return (
          <span className="flex items-center gap-1 text-amber-400 bg-amber-950/80 border border-amber-800 px-3 py-1 rounded-full text-xs font-bold">
            <AlertTriangle size={14} /> MODERATE DEGRADATION
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-rose-400 bg-rose-950/80 border border-rose-800 px-3 py-1 rounded-full text-xs font-bold">
            <XCircle size={14} /> OVERFITTED (Acute Alpha Decay)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-white">
              <Cpu className="text-indigo-400" size={18} />
              <h2 className="text-base font-bold">Out-of-Sample (OOS) & Walk-Forward Partitioning</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audits parameter stability and tests for curve-fitting by isolating unseen market data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">In-Sample Ratio:</span>
              <input
                type="range"
                min="0.5"
                max="0.85"
                step="0.05"
                value={trainRatio}
                onChange={(e) => setTrainRatio(parseFloat(e.target.value))}
                className="w-28 accent-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-emerald-400">
                {(trainRatio * 100).toFixed(0)}% IS / {((1 - trainRatio) * 100).toFixed(0)}% OOS
              </span>
            </div>

            <button
              type="button"
              onClick={() => runValidation(trainRatio)}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Play size={13} /> {loading ? 'Validating...' : 'Re-Run Partition Split'}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-rose-400 text-xs font-mono bg-rose-950/40 p-3 rounded-lg border border-rose-900">{error}</p>}

      {wfData && (
        <>
          {/* Robustness KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Robustness Diagnostic</span>
              <div className="my-2">{getStatusBadge(wfData.robustness_status)}</div>
              <p className="text-[11px] text-slate-500">
                Split boundary at <span className="font-mono text-slate-300">{wfData.split_date}</span>
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase">Walk-Forward Efficiency (WFER)</span>
              <p className={`text-2xl font-bold font-mono mt-1 ${wfData.wfer >= 0.6 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(wfData.wfer * 100).toFixed(1)}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Ratio of OOS CAGR over IS CAGR</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase">Sharpe Degradation</span>
              <p className={`text-2xl font-bold font-mono mt-1 ${wfData.sharpe_decay_pct <= 25 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {wfData.sharpe_decay_pct.toFixed(1)}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Loss of risk-adjusted edge on test data</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase">Sample Distribution</span>
              <p className="text-lg font-bold font-mono text-white mt-1">
                {wfData.train_bars} <span className="text-xs text-slate-500">IS</span> / {wfData.test_bars} <span className="text-xs text-slate-500">OOS</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Total {wfData.total_bars} daily bars evaluated</p>
            </div>
          </div>

          {/* IS vs OOS Equity Curve */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" /> Chronological Partition Split: Training vs. Unseen Testing
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-3 h-0.5 bg-indigo-400"></span> In-Sample (Training)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400"></span> Out-of-Sample (Live Test)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={wfData.combined_timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '0.75rem' }}
                    formatter={(v: any) => (v ? [`$${Number(v).toLocaleString()}`, 'Equity'] : ['—', ''])}
                  />
                  <ReferenceLine
                    x={wfData.split_date}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: `SPLIT BARRIER: ${wfData.split_date}`, fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }}
                  />
                  <Line type="monotone" dataKey="equity_is" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="equity_oos" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparative Audit Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Statistical Metric Degradation Matrix</h3>
            </div>
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-800/50 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3 font-sans">Metric</th>
                  <th className="p-3">In-Sample (Train)</th>
                  <th className="p-3">Out-of-Sample (Test)</th>
                  <th className="p-3">Decay (Delta)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-semibold text-white">Total Return</td>
                  <td className="p-3 text-slate-200">{wfData.in_sample.total_return_pct.toFixed(2)}%</td>
                  <td className="p-3 text-slate-200">{wfData.out_of_sample.total_return_pct.toFixed(2)}%</td>
                  <td className={`p-3 font-bold ${(wfData.out_of_sample.total_return_pct - wfData.in_sample.total_return_pct) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(wfData.out_of_sample.total_return_pct - wfData.in_sample.total_return_pct).toFixed(2)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-semibold text-white">CAGR</td>
                  <td className="p-3 text-slate-200">{wfData.in_sample.cagr.toFixed(2)}%</td>
                  <td className="p-3 text-slate-200">{wfData.out_of_sample.cagr.toFixed(2)}%</td>
                  <td className={`p-3 font-bold ${(wfData.out_of_sample.cagr - wfData.in_sample.cagr) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(wfData.out_of_sample.cagr - wfData.in_sample.cagr).toFixed(2)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-semibold text-white">Sharpe Ratio</td>
                  <td className="p-3 text-slate-200">{wfData.in_sample.sharpe_ratio.toFixed(2)}</td>
                  <td className="p-3 text-slate-200">{wfData.out_of_sample.sharpe_ratio.toFixed(2)}</td>
                  <td className={`p-3 font-bold ${(wfData.out_of_sample.sharpe_ratio - wfData.in_sample.sharpe_ratio) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(wfData.out_of_sample.sharpe_ratio - wfData.in_sample.sharpe_ratio).toFixed(2)}
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-semibold text-white">Max Drawdown</td>
                  <td className="p-3 text-rose-400">-{wfData.in_sample.max_drawdown_pct.toFixed(2)}%</td>
                  <td className="p-3 text-rose-400">-{wfData.out_of_sample.max_drawdown_pct.toFixed(2)}%</td>
                  <td className="p-3 text-slate-400">
                    {(wfData.out_of_sample.max_drawdown_pct - wfData.in_sample.max_drawdown_pct).toFixed(2)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-semibold text-white">Win Rate</td>
                  <td className="p-3 text-slate-200">{wfData.in_sample.win_rate_pct.toFixed(1)}%</td>
                  <td className="p-3 text-slate-200">{wfData.out_of_sample.win_rate_pct.toFixed(1)}%</td>
                  <td className={`p-3 font-bold ${(wfData.out_of_sample.win_rate_pct - wfData.in_sample.win_rate_pct) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(wfData.out_of_sample.win_rate_pct - wfData.in_sample.win_rate_pct).toFixed(1)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-sans font-semibold text-white">Profit Factor</td>
                  <td className="p-3 text-slate-200">{wfData.in_sample.profit_factor.toFixed(2)}</td>
                  <td className="p-3 text-slate-200">{wfData.out_of_sample.profit_factor.toFixed(2)}</td>
                  <td className={`p-3 font-bold ${(wfData.out_of_sample.profit_factor - wfData.in_sample.profit_factor) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(wfData.out_of_sample.profit_factor - wfData.in_sample.profit_factor).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};