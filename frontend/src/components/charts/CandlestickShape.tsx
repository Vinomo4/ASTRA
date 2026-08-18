// src/components/charts/CandlestickShape.tsx
import { memo } from 'react';

interface CandlestickProps {
  x?: number;
  width?: number;
  payload?: {
    open: number;
    close: number;
    high: number;
    low: number;
  };
  background?: {
    y: number;
    height: number;
  };
  priceDomain: [number, number];
}

export const CandlestickShape = memo(({ x = 0, width = 10, payload, background, priceDomain }: CandlestickProps) => {
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
  const candleWidth = Math.max(width * 0.7, 2);
  const candleX = x + (width - candleWidth) / 2;
  const wickX = x + width / 2;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={wickX} y1={yHigh} x2={wickX} y2={yLow} stroke={color} strokeWidth={1.5} />
      <rect x={candleX} y={candleBodyY} width={candleWidth} height={candleBodyHeight} fill={color} />
    </g>
  );
});