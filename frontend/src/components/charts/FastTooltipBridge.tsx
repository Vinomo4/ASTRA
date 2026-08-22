// src/components/charts/FastTooltipBridge.tsx
import { memo } from 'react';
import type { UnifiedDataPoint } from '../../types';

interface FastTooltipBridgeProps {
  active?: boolean;
  payload?: Array<{ payload: UnifiedDataPoint }>;
  onInspect: (data: UnifiedDataPoint, isHover: boolean) => void;
  showOHLC?: boolean;
}

export const FastTooltipBridge = memo(({ active, payload, onInspect, showOHLC = true }: FastTooltipBridgeProps) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    if (data && data.time) {
      onInspect(data, true);
    }
  }

  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-2xl text-xs font-mono backdrop-blur-md pointer-events-none">
      <div className="text-slate-400 font-sans font-semibold mb-1 border-b border-slate-800 pb-1 flex justify-between items-center gap-2">
        <span>{data.time}</span>
      </div>
      {showOHLC ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
          <div>O: <span className="text-white">${data.open?.toFixed(2)}</span></div>
          <div>H: <span className="text-emerald-400">${data.high?.toFixed(2)}</span></div>
          <div>L: <span className="text-rose-400">${data.low?.toFixed(2)}</span></div>
          <div>C: <span className="text-white font-bold">${data.close?.toFixed(2)}</span></div>
        </div>
      ) : (
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Strategy:</span>
            <span className="text-emerald-400 font-bold">${data.equity?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Buy & Hold:</span>
            <span className="text-slate-300 font-semibold">${data.benchmark_equity?.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
});