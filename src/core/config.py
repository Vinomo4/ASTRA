from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Trading Bot Core"
    environment: str = "development"
    debug: bool = True

    base_dir: Path = Path(__file__).resolve().parent.parent.parent
    data_dir: Path = base_dir / "data"
    duckdb_path: str = str(base_dir / "data" / "market_database.duckdb")

    default_initial_capital: float = 100_000.0
    default_commission_rate: float = 0.0005
    default_slippage_rate: float = 0.0002

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
