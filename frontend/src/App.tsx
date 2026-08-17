// frontend/src/App.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  Activity, 
  ShieldAlert, 
  DollarSign, 
  Play, 
  BarChart3 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface EquityPoint {
  time: string;
  value: number;
}

interface TradeItem {
  trade_id: string;
  symbol: string;
  side: string;
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  pnl_pct: number;
}

interface BacktestResult {
  symbol: string;
  initial_capital: number;
  final_equity: number;
  total_return_pct: number;
  cagr: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  total_trades: number;
  equity_curve: EquityPoint[];
  trades: TradeItem[];
}

export default function App() {
  const [params, setParams] = useState({
    symbol: 'AAPL',
    start_date: '2023-01-01',
    end_date: '2025-01-01',
    initial_capital: 100000,
    fast_ema: 20,
    slow_ema: 50,
    risk_fraction: 0.01,
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/backtest/run', params);
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute backtest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      {/* Header */}
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Activity className="text-emerald-500" /> Quantitative Trading Engine
        </h1>
        <p className="text-sm text-slate-400">Algorithmic Backtesting & Execution Dashboard</p>
      </header>

      {/* Control Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <form onSubmit={handleRunBacktest} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
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

          <div className="flex items-end">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Play size={16} /> {loading ? 'Running...' : 'Run Test'}
            </button>
          </div>
        </form>
        {error && <p className="text-rose-400 text-xs mt-3">{error}</p>}
      </div>

      {results && (
        <>
          {/* Metrics KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <DollarSign size={16} className="text-emerald-400" /> Final Equity
              </div>
              <div className="text-xl font-bold text-white">
                ${results.final_equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-xs mt-1 ${results.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {results.total_return_pct >= 0 ? '+' : ''}{results.total_return_pct.toFixed(2)}% Total Return
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <TrendingUp size={16} className="text-blue-400" /> CAGR
              </div>
              <div className="text-xl font-bold text-white">{results.cagr.toFixed(2)}%</div>
              <div className="text-xs text-slate-500 mt-1">Annualized Return</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <Activity size={16} className="text-purple-400" /> Sharpe Ratio
              </div>
              <div className="text-xl font-bold text-white">{results.sharpe_ratio.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-1">Sortino: {results.sortino_ratio.toFixed(2)}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <ShieldAlert size={16} className="text-rose-400" /> Max Drawdown
              </div>
              <div className="text-xl font-bold text-rose-400">{results.max_drawdown_pct.toFixed(2)}%</div>
              <div className="text-xs text-slate-500 mt-1">Peak-to-Trough Loss</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <BarChart3 size={16} className="text-amber-400" /> Executed Trades
              </div>
              <div className="text-xl font-bold text-white">{results.total_trades}</div>
              <div className="text-xs text-slate-500 mt-1">Closed Positions</div>
            </div>
          </div>

          {/* Equity Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
            <h2 className="text-base font-semibold text-white mb-4">Portfolio Equity Curve</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.equity_curve}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trades Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white">Closed Trades History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Symbol</th>
                    <th className="p-3">Entry Date</th>
                    <th className="p-3">Exit Date</th>
                    <th className="p-3">Entry Price</th>
                    <th className="p-3">Exit Price</th>
                    <th className="p-3">Units</th>
                    <th className="p-3">P&L ($)</th>
                    <th className="p-3">Return (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {results.trades.map((t) => (
                    <tr key={t.trade_id} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-400 font-mono text-xs">{t.trade_id.substring(0, 8)}</td>
                      <td className="p-3 font-semibold text-white">{t.symbol}</td>
                      <td className="p-3 text-slate-300">{t.entry_time}</td>
                      <td className="p-3 text-slate-300">{t.exit_time}</td>
                      <td className="p-3 text-slate-300">${t.entry_price.toFixed(2)}</td>
                      <td className="p-3 text-slate-300">${t.exit_price.toFixed(2)}</td>
                      <td className="p-3 text-slate-300">{t.quantity}</td>
                      <td className={`p-3 font-semibold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${t.pnl.toFixed(2)}
                      </td>
                      <td className={`p-3 font-semibold ${t.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}