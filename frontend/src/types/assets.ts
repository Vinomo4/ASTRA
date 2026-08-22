// frontend/src/types/assets.ts
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

  // US Equities
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'US Equities', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: 'US Equities', exchange: 'NASDAQ' },

  // Indices & ETFs
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