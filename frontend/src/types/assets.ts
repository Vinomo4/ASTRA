// frontend/src/types/assets.ts
export type AssetCategory = 'Crypto' | 'US Equities' | 'Indices & ETFs' | 'Commodities & FX';

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  Crypto: 'Criptoactivos',
  'US Equities': 'Acciones de EE. UU.',
  'Indices & ETFs': 'Índices y ETF',
  'Commodities & FX': 'Materias primas y divisas',
};

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

  // US Equities
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: 'US Equities', exchange: 'NASDAQ' },

  // Indices & ETFs
  { symbol: 'SPY', name: 'ETF SPDR S&P 500', category: 'Indices & ETFs', exchange: 'NYSE Arca' },
  { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq-100)', category: 'Indices & ETFs', exchange: 'NASDAQ' },
  { symbol: 'IWM', name: 'ETF iShares Russell 2000', category: 'Indices & ETFs', exchange: 'NYSE Arca' },
  { symbol: 'TLT', name: 'ETF iShares de bonos del Tesoro a más de 20 años', category: 'Indices & ETFs', exchange: 'NASDAQ' },

  // Commodities & FX
  { symbol: 'GLD', name: 'ETF SPDR de oro', category: 'Commodities & FX', exchange: 'NYSE Arca' },
  { symbol: 'USO', name: 'Fondo petrolero de Estados Unidos', category: 'Commodities & FX', exchange: 'NYSE Arca' },
  { symbol: 'EURUSD=X', name: 'Euro / dólar estadounidense', category: 'Commodities & FX', exchange: 'Divisas' },
  { symbol: 'GBPUSD=X', name: 'Libra esterlina / dólar estadounidense', category: 'Commodities & FX', exchange: 'Divisas' },
];