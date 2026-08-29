"""Expose the FastAPI application for ASGI servers and local launchers."""

from src.api.main import app

__all__ = ["app"]
