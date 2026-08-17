from src.core.models import Position


def test_position_unrealized_pnl() -> None:
    pos = Position(symbol="AAPL", quantity=10, average_entry_price=150.0)
    pos.update_market_price(160.0)
    assert pos.unrealized_pnl == 100.0
    pos.update_market_price(140.0)
    assert pos.unrealized_pnl == -100.0
