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

export interface OOSEquityPoint {
  time: string;
  value: number;
}

export interface WalkForwardResponse {
  symbol: string;
  strategy_id: string;
  timeframe: string;
  evaluation_period: string;
  total_windows: number;
  train_duration_months: number;
  test_step_months: number;
  initial_capital: number;
  final_equity: number;
  total_return_pct: number;
  cagr: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  profit_factor: number;
  win_rate_pct: number;
  total_trades: number;
  sharpe_is: number;
  sharpe_oos: number;
  wfer: number;
  validation_status: 'ROBUST' | 'MODERATE' | 'OVERFITTED';
  oos_equity_curve: OOSEquityPoint[];
}