"""Provide shared dependencies for API request handlers."""

from __future__ import annotations

from dataclasses import dataclass

from src.data_engine.storage_manager import StorageManager


@dataclass(slots=True)
class AppServices:
    """Hold services shared by API request handlers.

    Attributes:
        storage: Persistent market data storage.
    """

    storage: StorageManager


_services: AppServices | None = None


def get_services() -> AppServices:
    """Return the shared application services.

    Returns:
        Lazily initialized application services.
    """
    global _services
    if _services is None:
        _services = AppServices(storage=StorageManager())
    return _services
