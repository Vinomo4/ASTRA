// src/components/charts/FastTooltipBridge.tsx
import { memo, useEffect } from 'react';
import type { UnifiedDataPoint } from '../../types';
import {
    formatAdaptiveDate,
    formatAdaptivePrice,
    formatCompactCurrency,
    formatCompactVolume,
    formatPercent,
} from '../../utils/formatters';

interface FastTooltipBridgeProps {
  active?: boolean;
  payload?: Array<{ payload: UnifiedDataPoint }>;
  onInspect: (data: UnifiedDataPoint, isHover: boolean) => void;
  showOHLC?: boolean;
  timeframe?: string;
}

export const FastTooltipBridge = memo(
  ({ active, payload, onInspect, showOHLC = true, timeframe = '1d' }: FastTooltipBridgeProps) => {
    const isIntraday = ['15m', '1h', '4h', '5m'].includes(timeframe);

    useEffect(() => {
      if (active && payload && payload.length > 0) {
        const data = payload[0].payload;
        if (data && data.time) {
          onInspect(data, true);
        }
      }
    }, [active, payload, onInspect]);

    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    if (!data) return null;

    const isPriceUp = (data.close ?? 0) >= (data.open ?? 0);
    const priceChangePct =
      data.open && data.open > 0 ? (((data.close ?? 0) - data.open) / data.open) * 100 : 0;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 p-2.5 rounded-lg shadow-2xl text-xs font-mono backdrop-blur-md pointer-events-none min-w-[200px] z-50">
        {/* Header: Adaptive Date & Bar Change */}
        <div className="text-slate-400 font-sans font-semibold mb-1.5 border-b border-slate-800 pb-1.5 flex justify-between items-center gap-2">
          <span>{formatAdaptiveDate(data.time, isIntraday)}</span>
          {showOHLC && (
            <span
              className={`text-[11px] font-bold ${
                isPriceUp ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatPercent(priceChangePct)}
            </span>
          )}
        </div>

        {/* OHLC Bar Metrics */}
        {showOHLC ? (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">O:</span>
                <span className="text-slate-200">{formatAdaptivePrice(data.open)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">H:</span>
                <span className="text-emerald-400">{formatAdaptivePrice(data.high)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">L:</span>
                <span className="text-rose-400">{formatAdaptivePrice(data.low)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">C:</span>
                <span className="text-slate-100 font-bold">{formatAdaptivePrice(data.close)}</span>
              </div>
            </div>

            {data.volume !== undefined && data.volume > 0 && (
              <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-1">
                <span>Volumen:</span>
                <span className="font-medium text-slate-200">{formatCompactVolume(data.volume)}</span>
              </div>
            )}
          </div>
        ) : (
          /* Portfolio Equity Metrics */
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Patrimonio de la estrategia:</span>
              <span className="text-emerald-400 font-bold">
                {formatAdaptivePrice(data.equity)}
              </span>
            </div>
            {data.benchmark_equity !== undefined && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Buy & Hold:</span>
                <span className="text-slate-300 font-medium">
                  {formatCompactCurrency(data.benchmark_equity)}
                </span>
              </div>
            )}
            {data.drawdown_pct !== undefined && data.drawdown_pct < 0 && (
              <div className="flex justify-between gap-3 text-rose-400 border-t border-slate-800/80 pt-1 mt-1">
                <span>Drawdown:</span>
                <span className="font-semibold">{formatPercent(data.drawdown_pct, false)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);