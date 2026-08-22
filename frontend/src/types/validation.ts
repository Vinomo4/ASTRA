// frontend/src/types/validation.ts
export interface ValidationMetricsBlock {
  total_return_pct: number;
  cagr: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  total_trades: number;
  win_rate_pct: number;
  profit_factor: number;
}

export interface ValidationTimelinePoint {
  time: string;
  equity_is?: number | null;
  equity_oos?: number | null;
  is_oos: boolean;
}

export interface WalkForwardResponse {
  symbol: string;
  strategy_id: string;
  train_ratio: number;
  split_date: string;
  total_bars: number;
  train_bars: number;
  test_bars: number;
  robustness_status: 'ROBUST' | 'MODERATE' | 'OVERFITTED';
  wfer: number;
  sharpe_decay_pct: number;
  in_sample: ValidationMetricsBlock;
  out_of_sample: ValidationMetricsBlock;
  combined_timeline: ValidationTimelinePoint[];
}