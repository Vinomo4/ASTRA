# Trading Bot TFM

Automated trading research and backtesting system with event-driven architecture, local market data storage, strategy research, risk controls, and an API-first web architecture.

## Stack

- Python 3.11+
- uv
- Pydantic v2, dataclasses
- Polars, pandas, numpy, numba
- DuckDB + Parquet
- yfinance, ccxt, alpaca-py
- pandas-ta, scipy, statsmodels
- scikit-learn, xgboost, optuna, mlflow
- quantstats, empyrical-reloaded
- FastAPI, Uvicorn, WebSockets, Plotly
- React, TypeScript, Vite, Tailwind CSS
- pytest, ruff, mypy

## Quick start

```bash
uv sync --all-groups
uv run pytest
uv run uvicorn src.api.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Layout

The repository is organized around event-driven trading components in `src/`, reusable tests in `tests/`, configuration files under `config/`, a FastAPI backend in `src/api/`, and a Vite frontend in `frontend/`.
