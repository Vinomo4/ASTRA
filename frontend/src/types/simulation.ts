// frontend/src/types/simulation.ts
export type WorkspaceTab = 'studio' | 'performance' | 'stress_testing' | 'validation' | 'comparison';
export type ActiveTab = WorkspaceTab;

export interface BacktestParams {
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;

  strategy_id: string;
  strategy_params: Record<string, any>;

  fast_ema?: number;
  slow_ema?: number;
  risk_fraction: number;
  atr_multiplier_sl: number;
  atr_multiplier_tp: number;

  commission_bps: number;
  commission_fixed: number;
  slippage_bps: number;
  gap_slippage_enabled: boolean;

  num_simulations?: number;
  ruin_threshold_pct?: number;
}

export interface SimulationBandPoint {
  trade_step: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface MonteCarloAnalytics {
  num_simulations: number;
  trade_count: number;
  median_max_dd_pct: number;
  p90_max_dd_pct: number;
  p95_max_dd_pct: number;
  p99_max_dd_pct: number;
  risk_of_ruin_pct: number;
  ruin_threshold_pct: number;
  var_95_pct: number;
  cvar_95_pct: number;
  var_99_pct: number;
  cvar_99_pct: number;
  confidence_bands: SimulationBandPoint[];
}

export interface OHLCPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PortfolioSnapshot {
  time: string;
  equity: number;
  cash: number;
  position_quantity: number;
  position_avg_price: number;
  unrealized_pnl: number;
  drawdown_pct: number;
}

export interface BenchmarkPoint {
  time: string;
  equity: number;
  return_pct: number;
}

export interface EquityPoint {
  time: string;
  value: number;
}

export interface ExecutionMarker {
  time: string;
  price: number;
  nominal_price?: number;
  side: 'BUY' | 'SELL';
  quantity: number;
  reason?: string;
}

export interface ActivePosition {
  symbol: string;
  entry_time: string;
  entry_price: number;
  current_price: number;
  quantity: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  stop_loss?: number | null;
  take_profit?: number | null;
}

export interface TradeItem {
  trade_id: string;
  symbol: string;
  side: string;
  entry_time: string;
  exit_time: string;
  entry_price: number;
  effective_entry_price?: number;
  exit_price: number;
  effective_exit_price?: number;
  quantity: number;
  gross_pnl?: number;
  fees_paid?: number;
  commission_paid?: number;
  slippage_cost?: number;
  pnl: number;
  pnl_pct: number;
  exit_reason: string;
}

export interface TradeAnalytics {
  win_rate_pct: number;
  profit_factor: number;
  payoff_ratio: number;
  expectancy: number;
  avg_win: number;
  avg_loss: number;
  avg_trade_duration_days: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
}

export interface BenchmarkAnalytics {
  benchmark_total_return_pct: number;
  benchmark_cagr: number;
  alpha: number;
  beta: number;
  calmar_ratio: number;
}

export interface BacktestResult {
  symbol: string;
  initial_capital: number;
  final_equity: number;
  total_return_pct: number;
  cagr: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  total_trades: number;
  total_fees_paid?: number;
  total_slippage_paid?: number;
  monte_carlo?: MonteCarloAnalytics | null;
  trade_analytics: TradeAnalytics;
  benchmark_analytics: BenchmarkAnalytics;
  active_position: ActivePosition | null;
  execution_markers: ExecutionMarker[];
  ohlc_history: OHLCPoint[];
  equity_curve: EquityPoint[];
  benchmark_curve: BenchmarkPoint[];
  snapshots: PortfolioSnapshot[];
  trades: TradeItem[];
}

export type BacktestResponse = BacktestResult;

export interface UnifiedDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  equity: number;
  benchmark_equity: number;
  cash: number;
  position_quantity: number;
  position_avg_price: number;
  unrealized_pnl: number;
  drawdown_pct: number;
}