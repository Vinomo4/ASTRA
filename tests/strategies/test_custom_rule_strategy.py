# tests/strategies/test_custom_rule_strategy.py
from datetime import UTC, datetime, timedelta

from src.core.constants import SignalType
from src.core.events import MarketDataEvent, SignalEvent
from src.strategies.custom_rule_strategy import CustomRuleStrategy
from src.strategies.registry import StrategyRegistry


class TestCustomRuleStrategy:
    def test_metadata_contract(self):
        meta = CustomRuleStrategy.get_metadata()
        assert meta.id == "custom_rule_strategy"
        assert meta.category == "Rule-Based"
        param_names = [p.name for p in meta.parameters]
        assert "fast_period" in param_names
        assert "slow_period" in param_names
        assert "rsi_period" in param_names

    def test_registry_instantiation(self):
        strat = StrategyRegistry.create(
            "custom_rule_strategy",
            fast_period=10,
            slow_period=20,
            rsi_period=7,
        )
        assert isinstance(strat, CustomRuleStrategy)
        assert strat.fast_period == 10
        assert strat.slow_period == 20
        assert strat.rsi_period == 7

    def test_warmup_period_suppresses_signals(self):
        strat = CustomRuleStrategy(
            fast_period=10,
            slow_period=20,
            rsi_period=14,
            entry_rules=[{"indicator_a": "close", "operator": ">", "indicator_b": "ema_fast"}],
        )

        base_dt = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(15):  # Less than slow_period (20)
            event = MarketDataEvent(
                timestamp=base_dt + timedelta(hours=i),
                symbol="BTC-USD",
                open=100.0,
                high=105.0,
                low=95.0,
                close=102.0,
                volume=1000.0,
            )
            sig = strat.on_bar(event)
            assert sig is None

    def test_rule_evaluation_logic(self):
        strat = CustomRuleStrategy(fast_period=5, slow_period=10, rsi_period=5)

        indicators = {
            "close": 150.0,
            "ema_fast": 140.0,
            "rsi": 75.0,
            "volume": 2000.0,
            "volume_ma": 1500.0,
        }

        # Operator: >
        assert strat._evaluate_rule(
            {"indicator_a": "close", "operator": ">", "indicator_b": "ema_fast"},
            indicators,
        )
        # Operator: <
        assert not strat._evaluate_rule(
            {"indicator_a": "close", "operator": "<", "indicator_b": "ema_fast"},
            indicators,
        )
        # Static Threshold comparison
        assert strat._evaluate_rule(
            {"indicator_a": "rsi", "operator": ">=", "threshold": 70.0},
            indicators,
        )
        assert not strat._evaluate_rule(
            {"indicator_a": "rsi", "operator": "<", "threshold": 30.0},
            indicators,
        )
        # Unknown indicator key returns False safely
        assert not strat._evaluate_rule(
            {"indicator_a": "non_existent", "operator": ">", "threshold": 10.0},
            indicators,
        )

    def test_entry_and_exit_signal_flow(self):
        strat = CustomRuleStrategy(
            fast_period=5,
            slow_period=10,
            rsi_period=5,
            entry_rules=[
                {"indicator_a": "close", "operator": ">", "indicator_b": "ema_fast"},
                {"indicator_a": "rsi", "operator": ">", "threshold": 50.0},
            ],
            exit_rules=[
                {"indicator_a": "close", "operator": "<", "indicator_b": "ema_slow"},
            ],
        )

        base_dt = datetime(2024, 1, 1, tzinfo=UTC)
        signals: list[SignalEvent] = []

        # Feed 30 bars with an upward trend to trigger Long entry
        for i in range(30):
            price = 100.0 + (i * 2.0)
            event = MarketDataEvent(
                timestamp=base_dt + timedelta(hours=i),
                symbol="BTC-USD",
                open=price - 0.5,
                high=price + 1.0,
                low=price - 1.0,
                close=price,
                volume=1000.0,
            )
            sig = strat.on_bar(event)
            if sig is not None:
                signals.append(sig)

        assert any(s.signal_type == SignalType.LONG for s in signals)

        # Feed subsequent sharp drop to trigger Exit
        for i in range(30, 45):
            price = 160.0 - ((i - 30) * 5.0)
            event = MarketDataEvent(
                timestamp=base_dt + timedelta(hours=i),
                symbol="BTC-USD",
                open=price + 0.5,
                high=price + 1.0,
                low=price - 1.0,
                close=price,
                volume=1000.0,
            )
            sig = strat.on_bar(event)
            if sig is not None:
                signals.append(sig)

        assert any(s.signal_type == SignalType.EXIT for s in signals)
