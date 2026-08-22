// frontend/src/types/comparison.ts
export interface ComparisonTimelinePoint {
  time: string;
  equity_a: number;
  equity_b: number;
  benchmark_equity: number;
}

export interface StrategyComparisonMetrics {
  strategy_name: string;
  total_return_pct: number;
  cagr: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  profit_factor: number;
  total_trades: number;
  alpha: number;
  beta: number;
  total_frictions: number;
}

export interface AlphaAttributionDelta {
  delta_return_pct: number;
  delta_cagr: number;
  delta_sharpe: number;
  delta_max_dd: number;
  delta_win_rate: number;
  delta_alpha: number;
  outperforming_strategy: 'A' | 'B' | 'TIE';
}

export interface ComparisonResponse {
  symbol: string;
  start_date: string;
  end_date: string;
  strategy_a: StrategyComparisonMetrics;
  strategy_b: StrategyComparisonMetrics;
  attribution: AlphaAttributionDelta;
  timeline: ComparisonTimelinePoint[];
}