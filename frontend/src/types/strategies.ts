// frontend/src/types/strategies.ts
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

export interface StrategyRule {
  id: string;
  indicator_a: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  indicator_b?: string;
  threshold?: number;
}

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