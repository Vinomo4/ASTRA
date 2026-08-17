// frontend/src/App.tsx
import React, { useState, useMemo, useCallback, useRef, memo } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  Activity, 
  ShieldAlert, 
  DollarSign, 
  Play, 
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Building2,
  AlertCircle,
  CandlestickChart as CandlestickIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart,
  AreaChart, 
  Area, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceDot
} from 'recharts';

interface OHLCPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PortfolioSnapshot {
  time: string;
  equity: number;
  cash: number;
  position_quantity: number;
  position_avg_price: number;
  unrealized_pnl: number;
  drawdown_pct: number;
}

interface ExecutionMarker {
  time: string;
  price: number;
  side: 'BUY' | 'SELL';
  quantity: number;
}

interface ActivePosition {
  symbol: string;
  entry_time: string;
  entry_price: number;
  current_price: number;
  quantity: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
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
  active_position: ActivePosition | null;
  execution_markers: ExecutionMarker[];
  ohlc_history: OHLCPoint[];
  snapshots: PortfolioSnapshot[];
  trades: TradeItem[];
}

interface UnifiedDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  equity: number;
  cash: number;
  position_quantity: number;
  position_avg_price: number;
  unrealized_pnl: number;
  drawdown_pct: number;
}

const ASSET_PRESETS = [
  { symbol: 'AAPL', label: 'Apple Inc.', type: 'equity' },
  { symbol: 'NVDA', label: 'NVIDIA Corp.', type: 'equity' },
  { symbol: 'SPY', label: 'S&P 500 ETF', type: 'equity' },
  { symbol: 'BTC-USD', label: 'Bitcoin (USD)', type: 'crypto' },
  { symbol: 'ETH-USD', label: 'Ethereum (USD)', type: 'crypto' },
  { symbol: 'SOL-USD', label: 'Solana (USD)', type: 'crypto' },
];

// Custom Candlestick SVG Shape with pointer events disabled
const CandlestickShape = memo((props: any) => {
  const { x, width, payload, background, priceDomain } = props;
  if (!payload || !priceDomain || priceDomain[0] === priceDomain[1]) return null;

  const [minPrice, maxPrice] = priceDomain;
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#ef4444';

  const plotTop = background?.y ?? 10;
  const plotHeight = background?.height ?? 260;

  const scaleY = (val: number) => {
    const ratio = (val - minPrice) / (maxPrice - minPrice);
    return plotTop + plotHeight * (1 - ratio);
  };

  const yOpen = scaleY(open);
  const yClose = scaleY(close);
  const yHigh = scaleY(high);
  const yLow = scaleY(low);

  const candleBodyY = Math.min(yOpen, yClose);
  const candleBodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);
  const candleWidth = Math.max((width || 10) * 0.7, 2);
  const candleX = (x || 0) + ((width || 10) - candleWidth) / 2;
  const wickX = (x || 0) + (width || 10) / 2;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={wickX} y1={yHigh} x2={wickX} y2={yLow} stroke={color} strokeWidth={1.5} />
      <rect x={candleX} y={candleBodyY} width={candleWidth} height={candleBodyHeight} fill={color} />
    </g>
  );
});

// Fast Tooltip Bridge calling direct DOM updates
const FastTooltipBridge = memo(({ active, payload, onInspect, showOHLC = true }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as UnifiedDataPoint;
    if (data && data.time) {
      onInspect(data, true);
    }
  }

  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as UnifiedDataPoint;

  return (
    <div className="bg-slate-900/95 border border-slate-700 p-2 rounded-lg shadow-2xl text-xs font-mono backdrop-blur-md pointer-events-none">
      <div className="text-slate-400 font-sans font-semibold mb-1 border-b border-slate-800 pb-1">
        {data.time}
      </div>
      {showOHLC ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
          <div>O: <span className="text-white">${data.open?.toFixed(2)}</span></div>
          <div>H: <span className="text-emerald-400">${data.high?.toFixed(2)}</span></div>
          <div>L: <span className="text-rose-400">${data.low?.toFixed(2)}</span></div>
          <div>C: <span className="text-white font-bold">${data.close?.toFixed(2)}</span></div>
        </div>
      ) : (
        <div className="text-[11px]">
          Equity: <span className="text-emerald-400 font-bold">${data.equity?.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
});

export default function App() {
  const [params, setParams] = useState({
    symbol: 'NVDA',
    start_date: '2023-01-01',
    end_date: '2024-01-01',
    initial_capital: 100000,
    fast_ema: 20,
    slow_ema: 50,
    risk_fraction: 0.01,
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Direct DOM Refs for 0ms inspector updates
  const badgeRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const equityRef = useRef<HTMLParagraphElement>(null);
  const cashRef = useRef<HTMLParagraphElement>(null);
  const unitsRef = useRef<HTMLParagraphElement>(null);
  const avgPriceRef = useRef<HTMLParagraphElement>(null);
  const pnlRef = useRef<HTMLParagraphElement>(null);
  const ddRef = useRef<HTMLParagraphElement>(null);

  const unifiedTimeline: UnifiedDataPoint[] = useMemo(() => {
    if (!results || !results.snapshots || !results.ohlc_history) return [];
    const snapMap = new Map(results.snapshots.map((s) => [s.time, s]));

    return results.ohlc_history.map((bar, idx) => {
      const snap = snapMap.get(bar.time) || results.snapshots[idx] || {
        equity: 0,
        cash: 0,
        position_quantity: 0,
        position_avg_price: 0,
        unrealized_pnl: 0,
        drawdown_pct: 0,
      };

      return {
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        equity: snap.equity ?? 0,
        cash: snap.cash ?? 0,
        position_quantity: snap.position_quantity ?? 0,
        position_avg_price: snap.position_avg_price ?? 0,
        unrealized_pnl: snap.unrealized_pnl ?? 0,
        drawdown_pct: snap.drawdown_pct ?? 0,
      };
    });
  }, [results]);

  const updateInspectorDOM = useCallback((data: UnifiedDataPoint, isHover: boolean) => {
    if (!data) return;

    if (badgeRef.current) {
      badgeRef.current.textContent = isHover ? '● LIVE HOVER' : 'LATEST BAR';
      badgeRef.current.className = isHover
        ? 'text-emerald-400 font-semibold mr-1.5'
        : 'text-slate-500 mr-1.5';
    }
    if (dateRef.current) dateRef.current.textContent = data.time;
    if (equityRef.current) equityRef.current.textContent = `$${data.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (cashRef.current) cashRef.current.textContent = `$${data.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (unitsRef.current) unitsRef.current.textContent = data.position_quantity.toString();
    if (avgPriceRef.current) avgPriceRef.current.textContent = data.position_avg_price > 0 ? `$${data.position_avg_price.toFixed(2)}` : '—';

    if (pnlRef.current) {
      pnlRef.current.textContent = `$${data.unrealized_pnl.toFixed(2)}`;
      pnlRef.current.className = `text-base font-bold ${data.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }

    if (ddRef.current) {
      ddRef.current.textContent = `${data.drawdown_pct.toFixed(2)}%`;
      ddRef.current.className = `text-base font-bold ${data.drawdown_pct < 0 ? 'text-rose-400' : 'text-slate-400'}`;
    }
  }, []);

  const handleRunBacktest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handleMouseLeaveContainer = useCallback(() => {
    if (unifiedTimeline.length > 0) {
      updateInspectorDOM(unifiedTimeline[unifiedTimeline.length - 1], false);
    }
  }, [unifiedTimeline, updateInspectorDOM]);

  const priceDomain = useMemo(() => {
    if (unifiedTimeline.length === 0) return [0, 100];
    const minLow = Math.min(...unifiedTimeline.map((d) => d.low));
    const maxHigh = Math.max(...unifiedTimeline.map((d) => d.high));
    const padding = (maxHigh - minLow) * 0.05;
    return [Math.max(0, minLow - padding), maxHigh + padding];
  }, [unifiedTimeline]);

  const renderCandle = useCallback(
    (props: any) => <CandlestickShape {...props} priceDomain={priceDomain} />,
    [priceDomain]
  );

  const initialSnapshot = unifiedTimeline.length > 0 ? unifiedTimeline[unifiedTimeline.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-emerald-500" /> Quantitative Strategy Dashboard
          </h1>
          <p className="text-sm text-slate-400">Japanese Candlestick Execution & Synchronized Portfolio Inspector</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ASSET_PRESETS.map((preset) => (
            <button
              key={preset.symbol}
              onClick={() => setParams((p) => ({ ...p, symbol: preset.symbol }))}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                params.symbol === preset.symbol
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              {preset.type === 'crypto' ? <Coins size={13} /> : <Building2 size={13} />}
              {preset.symbol}
            </button>
          ))}
        </div>
      </header>

      {/* Input Parameters Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-sm">
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
              <Play size={16} /> {loading ? 'Running...' : 'Run Simulation'}
            </button>
          </div>
        </form>
        {error && <p className="text-rose-400 text-xs mt-3 font-mono">{error}</p>}
      </div>

      {results && (
        <>
          {/* Active Open Position Alert */}
          {results.active_position && (
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Active Position: {results.active_position.symbol}
                    <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                      LONG
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Entered on {results.active_position.entry_time} at ${results.active_position.entry_price.toFixed(2)} | Current: ${results.active_position.current_price.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block font-sans">Units</span>
                  <span className="text-white font-bold">{results.active_position.quantity}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">Unrealized P&L</span>
                  <span className={`font-bold ${results.active_position.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${results.active_position.unrealized_pnl.toFixed(2)} ({results.active_position.unrealized_pnl_pct >= 0 ? '+' : ''}{results.active_position.unrealized_pnl_pct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Strategy KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <DollarSign size={16} className="text-emerald-400" /> Final Equity
              </div>
              <div className="text-xl font-bold text-white">
                ${results.final_equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-xs mt-1 font-semibold ${results.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                <BarChart3 size={16} className="text-amber-400" /> Closed Trades
              </div>
              <div className="text-xl font-bold text-white">{results.total_trades}</div>
              <div className="text-xs text-slate-500 mt-1">
                {results.active_position ? '1 Active Position' : 'No Active Positions'}
              </div>
            </div>
          </div>

          {/* Synchronized Hover Wrapper */}
          <div onMouseLeave={handleMouseLeaveContainer}>
            {/* 1. Candlestick Price Chart */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <CandlestickIcon size={18} className="text-emerald-400" /> Price Action Candlesticks & Executions ({results.symbol})
                </h2>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <ArrowUpRight size={14} /> Buy Entry
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <ArrowDownRight size={14} /> Sell Exit
                  </span>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart syncId="portfolioSync" data={unifiedTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis
                      yAxisId="price"
                      stroke="#64748b"
                      fontSize={12}
                      domain={priceDomain as [number, number]}
                      tickFormatter={(v) => `$${v.toLocaleString()}`}
                    />
                    
                    <Tooltip
                      isAnimationActive={false}
                      cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                      content={<FastTooltipBridge onInspect={updateInspectorDOM} showOHLC={true} />}
                    />
                    
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="close"
                      stroke="transparent"
                      strokeWidth={0}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />

                    <Bar
                      yAxisId="price"
                      dataKey="close"
                      shape={renderCandle}
                      isAnimationActive={false}
                    />

                    {results.execution_markers.map((marker, idx) => (
                      <ReferenceDot
                        key={`${marker.time}-${idx}`}
                        yAxisId="price"
                        x={marker.time}
                        y={marker.price}
                        r={5}
                        fill={marker.side === 'BUY' ? '#10b981' : '#f43f5e'}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        isFront
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Portfolio Equity Growth Chart */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" /> Portfolio Equity Growth
                </h2>
                <span className="text-xs text-slate-400">Synchronized crosshair inspection active</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart syncId="portfolioSync" data={unifiedTimeline}>
                    <defs>
                      <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                    
                    <Tooltip
                      isAnimationActive={false}
                      cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                      content={<FastTooltipBridge onInspect={updateInspectorDOM} showOHLC={false} />}
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorEquity)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. Synchronized State Inspector */}
          <div className="bg-slate-900 border border-indigo-900/50 rounded-xl p-6 mb-8 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="text-indigo-400" size={18} />
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                  Synchronized State Inspector
                </h2>
              </div>
              <div className="text-xs font-mono bg-slate-950 px-3 py-1 rounded-md border border-slate-800 text-indigo-200">
                <span ref={badgeRef} className="text-slate-500 mr-1.5">LATEST BAR</span>
                Date: <span ref={dateRef} className="font-bold text-white">{initialSnapshot?.time ?? '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block font-sans">Portfolio Equity</span>
                <p ref={equityRef} className="text-base font-bold text-white">
                  ${initialSnapshot ? initialSnapshot.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block font-sans">Cash Reserve</span>
                <p ref={cashRef} className="text-base font-bold text-slate-300">
                  ${initialSnapshot ? initialSnapshot.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block font-sans">Active Units</span>
                <p ref={unitsRef} className="text-base font-bold text-slate-200">
                  {initialSnapshot?.position_quantity ?? 0}
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block font-sans">Avg Entry Price</span>
                <p ref={avgPriceRef} className="text-base font-bold text-slate-200">
                  {initialSnapshot && initialSnapshot.position_avg_price > 0 ? `$${initialSnapshot.position_avg_price.toFixed(2)}` : '—'}
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block font-sans">Unrealized P&L</span>
                <p ref={pnlRef} className={`text-base font-bold ${initialSnapshot && initialSnapshot.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${initialSnapshot?.unrealized_pnl.toFixed(2) ?? '0.00'}
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-500 block font-sans">Current Drawdown</span>
                <p ref={ddRef} className={`text-base font-bold ${initialSnapshot && initialSnapshot.drawdown_pct < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {initialSnapshot?.drawdown_pct.toFixed(2) ?? '0.00'}%
                </p>
              </div>
            </div>
          </div>

          {/* 4. Closed Trades Audit Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-semibold text-white">Closed Trades Audit Log</h2>
              <span className="text-xs text-slate-400">Total Closed: {results.trades.length} positions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Symbol</th>
                    <th className="p-3">Side</th>
                    <th className="p-3">Entry Date</th>
                    <th className="p-3">Exit Date</th>
                    <th className="p-3">Entry ($)</th>
                    <th className="p-3">Exit ($)</th>
                    <th className="p-3">Units</th>
                    <th className="p-3">P&L ($)</th>
                    <th className="p-3">Return (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {results.trades.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-slate-500 font-sans">
                        No closed trades completed in this date range.
                      </td>
                    </tr>
                  ) : (
                    results.trades.map((t) => (
                      <tr key={t.trade_id} className="hover:bg-slate-800/30">
                        <td className="p-3 text-slate-400">{t.trade_id}</td>
                        <td className="p-3 font-semibold text-white font-sans">{t.symbol}</td>
                        <td className="p-3">
                          <span className="bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded text-[11px]">
                            {t.side}
                          </span>
                        </td>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}