// src/components/views/PerformanceAuditView.tsx
import React, { useMemo, useCallback, useRef } from 'react';
import { BarChart2, TrendingUp, AlertCircle } from 'lucide-react';
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
  ReferenceDot,
  ReferenceLine,
} from 'recharts';

import type { UnifiedDataPoint } from '../../types';
import { useBacktest } from '../../context/BacktestContext';
import { KPIGrid } from '../KPIGrid';
import { TradeAnalyticsPanel } from '../TradeAnalyticsPanel';
import { ActivePositionBanner } from '../ActivePositionBanner';
import { SynchronizedInspector } from '../SynchronizedInspector';
import { TradeAuditTable } from '../TradeAuditTable';
import { CandlestickShape } from '../charts/CandlestickShape';
import { ExecutionMarkerShape } from '../charts/ExecutionMarkerShape';
import { FastTooltipBridge } from '../charts/FastTooltipBridge';

export const PerformanceAuditView: React.FC = () => {
  const { results, setActiveTab } = useBacktest();

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

      return {
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
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

  const updateInspectorDOM = useCallback((data: UnifiedDataPoint, isHover: boolean) => {
    if (!data) return;

    if (badgeRef.current) {
      badgeRef.current.textContent = isHover ? '● LIVE HOVER' : 'LATEST BAR';
      badgeRef.current.className = isHover ? 'text-emerald-400 font-semibold mr-1.5' : 'text-slate-500 mr-1.5';
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
        {/* Candlestick Execution Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-emerald-400" /> Price Action Candlesticks & Executions ({results.symbol})
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="inline-block w-0 h-0 border-x-[5px] border-x-transparent border-b-[9px] border-b-emerald-400"></span> Buy Entry
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-400 rotate-45"></span> Take Profit
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="inline-block w-0 h-0 border-x-[5px] border-x-transparent border-t-[9px] border-t-rose-500"></span> Stop Loss
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="inline-block w-2.5 h-2.5 bg-indigo-400 rounded-sm"></span> Signal Exit
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

                {results.active_position?.stop_loss && (
                  <ReferenceLine
                    yAxisId="price"
                    y={results.active_position.stop_loss}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `SL: $${results.active_position.stop_loss.toFixed(2)}`,
                      fill: '#f43f5e',
                      position: 'right',
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
                      value: `TP: $${results.active_position.take_profit.toFixed(2)}`,
                      fill: '#10b981',
                      position: 'right',
                      fontSize: 10,
                    }}
                  />
                )}

                {results.execution_markers.map((marker, idx) => (
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
        </div>

        {/* Equity Curve Area Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-6">
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