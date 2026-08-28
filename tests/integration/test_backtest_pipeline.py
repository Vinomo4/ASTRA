from datetime import UTC, datetime

from src.backtester.event_engine import EventEngine, _serialize_timestamp
from src.core.constants import SignalType
from src.core.events import SignalEvent


def test_event_engine_collects_events() -> None:
    engine = EventEngine()
    engine.put(
        SignalEvent(timestamp=datetime.now(UTC), symbol="SPY", signal_type=SignalType.LONG)
    )
    events = engine.run()
    assert len(events) == 1


def test_backtest_timestamp_serialization_preserves_intraday_time() -> None:
    timestamp = datetime(2026, 8, 28, 12, 0, tzinfo=UTC)

    assert _serialize_timestamp(timestamp) == "2026-08-28T12:00:00+00:00"
