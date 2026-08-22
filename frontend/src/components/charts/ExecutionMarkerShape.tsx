// src/components/charts/ExecutionMarkerShape.tsx
import { memo } from 'react';
import type { ExecutionMarker } from '../../types';

interface MarkerProps {
  cx?: number;
  cy?: number;
  marker: ExecutionMarker;
}

export const ExecutionMarkerShape = memo(({ cx, cy, marker }: MarkerProps) => {
  if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return null;

  const reason = marker?.reason || (marker?.side === 'BUY' ? 'SIGNAL_ENTRY' : 'SIGNAL_EXIT');

  if (marker.side === 'BUY' || reason === 'SIGNAL_ENTRY') {
    return (
      <g style={{ pointerEvents: 'none' }}>
        <polygon
          points={`${cx},${cy - 9} ${cx - 7},${cy + 5} ${cx + 7},${cy + 5}`}
          fill="#10b981"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  if (reason === 'TAKE_PROFIT') {
    return (
      <g style={{ pointerEvents: 'none' }}>
        <polygon
          points={`${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}`}
          fill="#34d399"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
        <circle cx={cx} cy={cy} r={2} fill="#064e3b" />
      </g>
    );
  }

  if (reason === 'STOP_LOSS') {
    return (
      <g style={{ pointerEvents: 'none' }}>
        <polygon
          points={`${cx},${cy + 9} ${cx - 7},${cy - 5} ${cx + 7},${cy - 5}`}
          fill="#f43f5e"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={cx - 5.5}
        y={cy - 5.5}
        width={11}
        height={11}
        rx={2}
        fill="#818cf8"
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    </g>
  );
});