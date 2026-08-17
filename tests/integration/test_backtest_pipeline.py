from datetime import UTC, datetime

from src.backtester.event_engine import EventEngine
from src.core.constants import SignalType
from src.core.events import SignalEvent


def test_event_engine_collects_events() -> None:
    engine = EventEngine()
    engine.put(
        SignalEvent(timestamp=datetime.now(UTC), symbol="SPY", signal_type=SignalType.LONG)
    )
    events = engine.run()
    assert len(events) == 1
