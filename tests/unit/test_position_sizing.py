from src.risk_engine.position_sizing import VolatilityPositionSizer


def test_position_sizer_caps_by_equity() -> None:
    sizer = VolatilityPositionSizer(risk_per_trade=0.01, atr_multiplier=2.0)
    quantity = sizer.calculate_order_quantity(1000.0, 100.0, 1.0)
    assert quantity <= 10.0
