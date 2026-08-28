// frontend/src/components/views/PerformanceAuditView.tsx
import React, { useMemo, useCallback, useRef, useState } from 'react';
import { BarChart2, TrendingUp, AlertCircle, RefreshCw, BarChart, ZoomIn } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart as RechartsBarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  Cell,
} from 'recharts';

import { useBacktest } from '../../context/BacktestContext';
import { KPIGrid } from '../KPIGrid';
import { TradeAnalyticsPanel } from '../TradeAnalyticsPanel';
import { ActivePositionBanner } from '../ActivePositionBanner';
import { SynchronizedInspector } from '../SynchronizedInspector';
import { TradeAuditTable } from '../TradeAuditTable';
import { CandlestickShape } from '../charts/CandlestickShape';
import { ExecutionMarkerShape } from '../charts/ExecutionMarkerShape';
import { FastTooltipBridge } from '../charts/FastTooltipBridge';
import {
  formatAxisPrice,
  formatAdaptivePrice,
  formatCompactCurrency,
  formatCompactVolume,
  formatAxisDate,
  formatPercent,
} from '../../utils/formatters';

const TIMEFRAME_OPTIONS = [
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

const ZOOM_OPTIONS = [
  { label: '50 Bars', count: 50 },
  { label: '100 Bars', count: 100 },
  { label: '250 Bars', count: 250 },
  { label: 'All Bars', count: 0 },
];

export const PerformanceAuditView: React.FC = () => {
  const { results, params, setTimeframe, runSimulation, loading, setActiveTab } = useBacktest();

  const [chartMode, setChartMode] = useState<'candles' | 'line'>('candles');
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [zoomBars, setZoomBars] = useState<number>(0);

  const badgeRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const equityRef = useRef<HTMLParagraphElement>(null);
  const cashRef = useRef<HTMLParagraphElement>(null);
  const unitsRef = useRef<HTMLParagraphElement>(null);
  const avgPriceRef = useRef<HTMLParagraphElement>(null);
  const pnlRef = useRef<HTMLParagraphElement>(null);
  const ddRef = useRef<HTMLParagraphElement>(null);

  const isIntraday = params.timeframe === '4h';

  const formatXTick = useCallback(
    (timeStr: string) => formatAxisDate(timeStr, isIntraday),
    [isIntraday]
  );

  const fullTimeline = useMemo(() => {
    if (!results || !results.snapshots || !results.ohlc_history) return [];
    const snapMap = new Map(results.snapshots.map((s) => [s.time, s]));
    const benchMap = new Map((results.benchmark_curve || []).map((b) => [b.time, b.equity]));

    return results.ohlc_history.map((bar, idx) => {
      const snap = snapMap.get(bar.time) || results.snapshots[idx] || {
        equity: 0,
        cash: 0,
        position_quantity: 0,
        position_avg_price: 0,
        unrealized_pnl: 0,
        drawdown_pct: 0,
      };

      const isUp = bar.close >= bar.open;

      return {
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        isUp,
        equity: snap.equity ?? 0,
        benchmark_equity: benchMap.get(bar.time) ?? results.initial_capital,
        cash: snap.cash ?? 0,
        position_quantity: snap.position_quantity ?? 0,
        position_avg_price: snap.position_avg_price ?? 0,
        unrealized_pnl: snap.unrealized_pnl ?? 0,
        drawdown_pct: snap.drawdown_pct ?? 0,
      };
    });
  }, [results]);

  const visibleTimeline = useMemo(() => {
    if (zoomBars <= 0 || fullTimeline.length <= zoomBars) {
      return fullTimeline;
    }
    return fullTimeline.slice(-zoomBars);
  }, [fullTimeline, zoomBars]);

  const updateInspectorDOM = useCallback((data: any, isHover: boolean) => {
    if (!data) return;

    if (badgeRef.current) {
      badgeRef.current.textContent = isHover ? '● LIVE HOVER' : 'LATEST BAR';
      badgeRef.current.className = isHover ? 'text-emerald-400 font-semibold mr-1.5' : 'text-slate-500 mr-1.5';
    }
    if (dateRef.current) dateRef.current.textContent = data.time;
    if (equityRef.current) equityRef.current.textContent = formatAdaptivePrice(data.equity);
    if (cashRef.current) cashRef.current.textContent = formatAdaptivePrice(data.cash);
    if (unitsRef.current) unitsRef.current.textContent = data.position_quantity.toString();
    if (avgPriceRef.current) {
      avgPriceRef.current.textContent =
        data.position_avg_price > 0 ? formatAdaptivePrice(data.position_avg_price) : '—';
    }

    if (pnlRef.current) {
      const pnlSign = data.unrealized_pnl > 0 ? '+' : '';
      pnlRef.current.textContent = `${pnlSign}${formatAdaptivePrice(data.unrealized_pnl)}`;
      pnlRef.current.className = `text-base font-bold ${
        data.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
      }`;
    }

    if (ddRef.current) {
      ddRef.current.textContent = formatPercent(data.drawdown_pct, false);
      ddRef.current.className = `text-base font-bold ${
        data.drawdown_pct < 0 ? 'text-rose-400' : 'text-slate-400'
      }`;
    }
  }, []);

  const handleMouseLeaveContainer = useCallback(() => {
    if (visibleTimeline.length > 0) {
      updateInspectorDOM(visibleTimeline[visibleTimeline.length - 1], false);
    }
  }, [visibleTimeline, updateInspectorDOM]);

  const priceDomain = useMemo(() => {
    if (visibleTimeline.length === 0) return [0, 100];
    const minLow = Math.min(...visibleTimeline.map((d) => d.low));
    const maxHigh = Math.max(...visibleTimeline.map((d) => d.high));
    const padding = (maxHigh - minLow) * 0.06;
    return [Math.max(0, minLow - padding), maxHigh + padding];
  }, [visibleTimeline]);

  const visibleMarkers = useMemo(() => {
    if (!results || !results.execution_markers) return [];
    if (visibleTimeline.length === 0) return [];
    const startTime = visibleTimeline[0].time;
    const endTime = visibleTimeline[visibleTimeline.length - 1].time;
    return results.execution_markers.filter((m) => m.time >= startTime && m.time <= endTime);
  }, [results, visibleTimeline]);

  const renderCandle = useCallback(
    (props: any) => <CandlestickShape {...props} priceDomain={priceDomain} />,
    [priceDomain]
  );

  const handleTimeframeSelect = async (tf: string) => {
    setTimeframe(tf);
    await runSimulation({ ...params, timeframe: tf });
  };

  const initialSnapshot = visibleTimeline.length > 0 ? (visibleTimeline[visibleTimeline.length - 1] as any) : null;

  if (!results) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <AlertCircle size={36} className="mx-auto mb-3 text-slate-500" />
        <p className="font-semibold text-slate-200">No Simulation Data Generated</p>
        <p className="text-xs text-slate-500 mt-1 mb-4">Execute a backtest run in the Strategy Studio to audit performance.</p>
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
        >
          Open Strategy Studio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {results.active_position && <ActivePositionBanner position={results.active_position} />}
      <KPIGrid results={results} />
      <TradeAnalyticsPanel analytics={results.trade_analytics} trades={results.trades} />

      <div onMouseLeave={handleMouseLeaveContainer}>
        {/* Main Price Action & Execution Chart Container */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <BarChart2 size={20} className="text-emerald-400" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  Price Action & Executions ({results.symbol})
                </h2>
                <span className="text-xs text-slate-500">
                  {params.start_date} to {params.end_date} • {params.timeframe || '4h'} • {fullTimeline.length} Total Bars
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                {TIMEFRAME_OPTIONS.map((tf) => (
                  <button
                    key={tf.value}
                    type="button"
                    disabled={loading}
                    onClick={() => handleTimeframeSelect(tf.value)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      (params.timeframe || '4h') === tf.value
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartMode('candles')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    chartMode === 'candles'
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  Candlesticks
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('line')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    chartMode === 'line'
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  Line
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowVolume((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                  showVolume
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <BarChart size={13} /> Volume
              </button>

              {loading && (
                <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                  <RefreshCw size={12} className="animate-spin" /> Live Fetching...
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="inline-block w-0 h-0 border-x-[5px] border-x-transparent border-b-[9px] border-b-emerald-400"></span> Buy
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-400 rotate-45"></span> TP
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="inline-block w-0 h-0 border-x-[5px] border-x-transparent border-t-[9px] border-t-rose-500"></span> SL
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="inline-block w-2.5 h-2.5 bg-indigo-400 rounded-sm"></span> Exit
              </span>
            </div>
          </div>

          {/* Primary Chart Canvas */}
          <div className={showVolume ? 'h-72 w-full' : 'h-88 w-full'}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart syncId="portfolioSync" data={visibleTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  minTickGap={45}
                  tickFormatter={formatXTick}
                  hide={showVolume}
                />
                <YAxis
                  yAxisId="price"
                  stroke="#64748b"
                  fontSize={11}
                  domain={priceDomain as [number, number]}
                  allowDecimals={false}
                  tickFormatter={(v) => formatAxisPrice(v)}
                  orientation="right"
                  width={80}
                />

                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  content={
                    <FastTooltipBridge
                      onInspect={updateInspectorDOM}
                      showOHLC={true}
                      timeframe={params.timeframe}
                    />
                  }
                />

                {chartMode === 'candles' && (
                  <Bar
                    yAxisId="price"
                    dataKey="close"
                    shape={renderCandle}
                    isAnimationActive={false}
                  />
                )}

                {chartMode === 'line' && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}

                {results.active_position?.stop_loss && (
                  <ReferenceLine
                    yAxisId="price"
                    y={results.active_position.stop_loss}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `SL: ${formatAdaptivePrice(results.active_position.stop_loss)}`,
                      fill: '#f43f5e',
                      position: 'left',
                      fontSize: 10,
                    }}
                  />
                )}

                {results.active_position?.take_profit && (
                  <ReferenceLine
                    yAxisId="price"
                    y={results.active_position.take_profit}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `TP: ${formatAdaptivePrice(results.active_position.take_profit)}`,
                      fill: '#10b981',
                      position: 'left',
                      fontSize: 10,
                    }}
                  />
                )}

                {visibleMarkers.map((marker, idx) => (
                  <ReferenceDot
                    key={`${marker.time}-${idx}-${marker.side}`}
                    yAxisId="price"
                    x={marker.time}
                    y={marker.price}
                    shape={(props) => <ExecutionMarkerShape {...props} marker={marker} />}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Sub-Pane: Trading Volume */}
          {showVolume && (
            <div className="h-28 w-full pt-2 border-t border-slate-800/60 mt-2">
              <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                <BarChart size={12} className="text-slate-500" /> Trading Volume
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <RechartsBarChart syncId="portfolioSync" data={visibleTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    minTickGap={45}
                    tickFormatter={formatXTick}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    orientation="right"
                    allowDecimals={false}
                    tickFormatter={(v) => formatCompactVolume(v)}
                    width={80}
                  />
                  <Tooltip
                    isAnimationActive={false}
                    cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                    content={
                      <FastTooltipBridge
                        onInspect={updateInspectorDOM}
                        showOHLC={false}
                        timeframe={params.timeframe}
                      />
                    }
                  />
                  <Bar dataKey="volume" isAnimationActive={false}>
                    {visibleTimeline.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isUp ? '#10b981' : '#f43f5e'}
                        fillOpacity={0.65}
                      />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bottom Footer: Zoom Window Selector */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/70 text-xs text-slate-400">
            <span className="text-[11px] text-slate-500">
              Showing <span className="text-slate-300 font-medium">{visibleTimeline.length}</span> of <span className="text-slate-300 font-medium">{fullTimeline.length}</span> bars
            </span>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-500 px-1.5 flex items-center gap-1">
                <ZoomIn size={12} /> Range:
              </span>
              {ZOOM_OPTIONS.map((z) => (
                <button
                  key={z.label}
                  type="button"
                  onClick={() => setZoomBars(z.count)}
                  className={`px-2 py-0.5 text-xs rounded-md transition-all ${
                    zoomBars === z.count
                      ? 'bg-slate-800 text-emerald-400 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy Equity vs. Benchmark Curve */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Strategy Equity vs. Buy & Hold Benchmark
            </h2>
            <div className="flex items-center gap-5 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="inline-block w-3 h-0.5 bg-emerald-400"></span> Strategy Equity
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="inline-block w-3 h-0.5 border-t border-dashed border-slate-400"></span> {results.symbol} Buy & Hold
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart syncId="portfolioSync" data={visibleTimeline}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  minTickGap={45}
                  tickFormatter={formatXTick}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  domain={['auto', 'auto']}
                  allowDecimals={false}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  orientation="right"
                  width={80}
                />

                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  content={
                    <FastTooltipBridge
                      onInspect={updateInspectorDOM}
                      showOHLC={false}
                      timeframe={params.timeframe}
                    />
                  }
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

                <Line
                  type="monotone"
                  dataKey="benchmark_equity"
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <SynchronizedInspector
        initialSnapshot={initialSnapshot}
        badgeRef={badgeRef}
        dateRef={dateRef}
        equityRef={equityRef}
        cashRef={cashRef}
        unitsRef={unitsRef}
        avgPriceRef={avgPriceRef}
        pnlRef={pnlRef}
        ddRef={ddRef}
      />

      <TradeAuditTable trades={results.trades} />
    </div>
  );
};