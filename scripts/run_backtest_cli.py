# scripts/run_backtest_cli.py
from src.analytics.metrics import PerformanceAnalytics
from src.backtester.event_engine import BacktestEngine
from src.data_engine.storage_manager import StorageManager
from src.strategies.trend_following import TrendFollowingStrategy


def main() -> None:
    symbol = "AAPL"
    start_date = "2023-01-01"
    end_date = "2025-01-01"
    initial_capital = 100_000.0

    print(f"1. Loading OHLCV data for {symbol} from DuckDB...")
    storage = StorageManager()
    df = storage.load_ohlcv(symbol, start_date, end_date)

    if df.empty:
        raise ValueError(
            f"No data found in DuckDB for {symbol} between {start_date} and {end_date}."
        )
    print(f"   Loaded {len(df)} bars.")

    print("2. Initializing TrendFollowingStrategy and BacktestEngine...")
    strategy = TrendFollowingStrategy(fast_ema=20, slow_ema=50, atr_period=14)
    engine = BacktestEngine(
        strategy=strategy,
        initial_capital=initial_capital,
        commission_rate=0.0005,
        slippage_rate=0.0002,
        risk_fraction=0.01,
    )

    print("3. Running simulation...")
    results = engine.run(df)

    print("\n" + "=" * 45)
    print(f"        BACKTEST RESULTS: {symbol}")
    print("=" * 45)
    print(f"Initial Capital:      ${results['initial_capital']:,.2f}")
    print(f"Final Equity:         ${results['final_equity']:,.2f}")
    print(f"Total Return:         {results['total_return_pct']:.2f}%")
    print(f"CAGR:                 {results['cagr']:.2f}%")
    print(f"Sharpe Ratio:         {results['sharpe_ratio']:.2f}")
    print(f"Sortino Ratio:        {results['sortino_ratio']:.2f}")
    print(f"Max Drawdown:         {results['max_drawdown_pct']:.2f}%")
    print(f"Total Closed Trades:  {results['total_trades']}")
    print("=" * 45)

    if engine.trades:
        print("\nSample Trade Log (First 3 Trades):")
        for trade in engine.trades[:3]:
            print(
                f" - {trade.trade_id} | Entry: {trade.entry_time.date()} @ ${trade.entry_price:.2f} | "
                f"Exit: {trade.exit_time.date()} @ ${trade.exit_price:.2f} | "
                f"PnL: ${trade.pnl:.2f} ({trade.pnl_pct * 100:.2f}%)"
            )


if __name__ == "__main__":
    main()
