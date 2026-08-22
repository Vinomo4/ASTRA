// frontend/src/types/backtest.ts

// --- Workspace & Navigation Types ---
export type WorkspaceTab = 'studio' | 'performance' | 'stress_testing' | 'validation' | 'comparison';
export type ActiveTab = WorkspaceTab;

// --- Asset Taxonomy & Market Catalog ---
export type AssetCategory = 'Crypto' | 'US Equities' | 'Indices & ETFs' | 'Commodities & FX';

export interface AssetInfo {
  symbol: string;
  name: string;
  category: AssetCategory;
  exchange: string;
}

export const ASSET_CATALOG: AssetInfo[] = [
  // Cryptocurrencies
  { symbol: 'BTC-USD', name: 'Bitcoin (USD)', category: 'Crypto', exchange: 'Spot / CCXT' },
  { symbol: 'ETH-USD', name: 'Ethereum (USD)', category: 'Crypto', exchange: 'Spot / CCXT' },
  { symbol: 'SOL-USD', name: 'Solana (USD)', category: 'Crypto', exchange: 'Spot / CCXT' },
  { symbol: 'BNB-USD', name: 'Binance Coin (USD)', category: 'Crypto', exchange: 'Spot / CCXT' },
  { symbol: 'XRP-USD', name: 'Ripple (USD)', category: 'Crypto', exchange: 'Spot / CCXT' },
  { symbol: 'AVAX-USD', name: 'Avalanche (USD)', category: 'Crypto', exchange: 'Spot / CCXT' },

  // US Equities (Mega-Caps & Momentum)
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: 'US Equities', exchange: 'NASDAQ' },

  // Indices & Benchmark ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'Indices & ETFs', exchange: 'NYSE Arca' },
  { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq-100)', category: 'Indices & ETFs', exchange: 'NASDAQ' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', category: 'Indices & ETFs', exchange: 'NYSE Arca' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond', category: 'Indices & ETFs', exchange: 'NASDAQ' },

  // Commodities & FX
  { symbol: 'GLD', name: 'SPDR Gold Shares', category: 'Commodities & FX', exchange: 'NYSE Arca' },
  { symbol: 'USO', name: 'United States Oil Fund', category: 'Commodities & FX', exchange: 'NYSE Arca' },
  { symbol: 'EURUSD=X', name: 'Euro / US Dollar', category: 'Commodities & FX', exchange: 'Forex' },
  { symbol: 'GBPUSD=X', name: 'British Pound / US Dollar', category: 'Commodities & FX', exchange: 'Forex' },
];

// --- Strategy Metadata & Parameter Schemas ---
export interface ParameterDefinition {
  name: string;
  label: string;
  param_type: 'int' | 'float' | 'bool' | 'str' | 'select';
  default: any;
  min_value?: number;
  max_value?: number;
  step?: number;
  options?: string[];
  description: string;
}

export interface StrategyMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: ParameterDefinition[];
}

export interface StrategyListResponse {
  strategies: StrategyMetadata[];
}

// --- Dynamic Visual Rule Constructor Types ---
export interface StrategyRule {
  id: string;
  indicator_a: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  indicator_b?: string;
  threshold?: number;
}

// --- Strategy Preset Persistence Types ---
export interface StrategyPreset {
  preset_name: string;
  strategy_id: string;
  strategy_params: Record<string, any>;
  risk_fraction: number;
  atr_multiplier_sl: number;
  atr_multiplier_tp: number;
  commission_bps: number;
  commission_fixed: number;
  slippage_bps: number;
  gap_slippage_enabled: boolean;
  description?: string;
  updated_at?: string;
}

export interface StrategyPresetListResponse {
  presets: StrategyPreset[];
}

// --- Simulation Request Parameters ---
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

// --- Monte Carlo & Statistical Resilience Types ---
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

// --- Core Backtest Result & Performance Types ---
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

// --- Out-of-Sample (OOS) & Walk-Forward Validation Types ---
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

// --- Strategy Comparison & Alpha Attribution Types ---
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