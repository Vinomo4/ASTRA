from __future__ import annotations

from dataclasses import dataclass

from src.data_engine.storage_manager import StorageManager


@dataclass(slots=True)
class AppServices:
    storage: StorageManager


_services: AppServices | None = None


def get_services() -> AppServices:
    global _services
    if _services is None:
        _services = AppServices(storage=StorageManager())
    return _services
