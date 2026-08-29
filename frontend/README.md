# ASTRA Frontend

This frontend is the operator workspace for ASTRA backtests. It provides a single-page React interface for configuring simulations, inspecting price action and executions, reviewing Monte Carlo output and an exploratory client-side OOS audit, and comparing strategy variants against each other and against the benchmark curves returned by the backend. The frontend does not currently call the backend walk-forward endpoint.

This document complements the project-level guidance in [../README.md](../README.md), the backend and system overview in [../docs/architecture.md](../docs/architecture.md), and the research context in [../docs/methodology.md](../docs/methodology.md).

## Stack

- React 19
- TypeScript 6
- Vite 8
- Axios for HTTP calls to the Python API
- Recharts for charts
- Tailwind CSS 4 via the Vite plugin
- Lucide React for icons
- ESLint 10 with the current repo baseline

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`, as required by the installed Vite version
- npm
- The ASTRA backend running locally at `http://127.0.0.1:8000`

The frontend currently uses hard-coded API URLs. There is no environment-based API host override.

## Install

From [frontend](.) run:

```bash
npm ci
```

## Scripts

The current `package.json` scripts are:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

- `npm run dev`: starts the Vite development server.
- `npm run build`: runs `tsc -b` and produces a production bundle with Vite.
- `npm run lint`: runs the current ESLint configuration across the frontend workspace.
- `npm run preview`: serves the production build locally.

## Run Locally

1. Start the backend first and confirm it is reachable at `http://127.0.0.1:8000`.
2. Install frontend dependencies with `npm ci`.
3. Start the UI with `npm run dev`.
4. Optionally validate the production bundle with `npm run build` and inspect it with `npm run preview`.

If the backend is not running, metadata loading and simulation requests will fail and the UI will show connection-related errors or empty states.

## Architecture

The frontend is intentionally small and centered around one shared context rather than routing or client-side persistence.

- `src/main.tsx`: bootstraps React with `StrictMode` and mounts `App`.
- `src/App.tsx`: wraps the application in `BacktestProvider`, renders the top navigation and global control ribbon, and switches views with a simple tab-based workspace router.
- `src/context/BacktestContext.tsx`: owns the active tab, backtest parameters, fetched strategy and preset metadata, simulation results, loading and error state, and the in-memory results cache.
- `src/components/layout`: global frame elements such as `TopNavigation`, `GlobalControlRibbon`, and the asset picker modal.
- `src/components/views`: the five top-level workspaces rendered from the active tab.
- `src/components`: reusable panels, KPI blocks, tables, and chart helpers shared by the views.
- `src/components/charts`: custom Recharts shapes and tooltip bridge helpers.
- `src/types`: TypeScript contracts for assets, strategies, simulations, validation, and comparison responses.
- `src/utils`: formatting helpers for numbers, prices, percentages, and UTC date rendering.

### Current Navigation Views

| Spanish navigation label | Internal tab | Current capability |
| --- | --- | --- |
| Registro de estrategias | `studio` | Selects a base strategy or preset, edits strategy parameters, builds custom rule-based strategies, and manages frictions, sizing, and preset save/delete flows. |
| Auditoría de rendimiento | `performance` | Displays KPIs, trade analytics, synchronized price and equity inspection, execution markers, and the detailed trade audit table for the active simulation. |
| Pruebas de estrés y MC | `stress_testing` | Shows Monte Carlo bootstrap outputs, confidence bands, risk of ruin, VaR, and CVaR when the backend returns enough trade data. |
| Walk-Forward y OOS | `validation` | Evaluates the active simulation with a simple IS/OOS split and also exposes the static academic benchmark matrix used in the TFM narrative. |
| Benchmark de modelos | `comparison` | Runs head-to-head comparisons between strategies or presets, then renders attribution deltas and comparative equity curves. |

## API Calls Consumed

All current API calls are hard-coded to `http://127.0.0.1:8000`.

| Method | Endpoint | Used by | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/backtest/strategies` | `BacktestContext` | Loads strategy metadata used by the strategy catalog and parameter forms. |
| `GET` | `/api/backtest/presets` | `BacktestContext` | Loads user presets shown in the strategy studio and comparison selectors. |
| `POST` | `/api/backtest/run` | `BacktestContext` | Executes the active backtest and hydrates all downstream views from one result payload. |
| `POST` | `/api/backtest/presets` | `StrategyStudioView` | Saves a preset using the current strategy, frictions, sizing, and optional custom rules. |
| `DELETE` | `/api/backtest/presets/:name` | `StrategyStudioView` | Deletes a saved preset and refreshes the preset list. |
| `POST` | `/api/backtest/compare` | `ModelComparisonView` | Runs a comparative simulation between two selected strategies or presets. |

## State and Cache Behavior

- `BacktestContext` is the only shared state container.
- Strategy metadata and presets are requested initially and after preset changes. Because the metadata effect currently depends indirectly on the full `params` object, parameter changes also trigger redundant metadata requests.
- The first metadata load auto-triggers one initial backtest run.
- Backtest results are cached in memory with a composite key built from symbol, timeframe, date range, strategy, frictions, sizing, Monte Carlo settings, and serialized strategy parameters.
- Cached results are reused whenever the same complete cache key is requested. `runSimulation` supports a programmatic `forceRefresh` argument, but no current UI caller sets it to `true`.
- The main stale indicator tracks symbol, timeframe, dates, strategy, capital, and strategy parameters; it omits sizing, friction, and Monte Carlo controls.
- The comparison stale indicator tracks model selectors, symbol, and dates; it omits timeframe, capital, sizing, and friction.
- There is no persistent client storage. Reloading the page resets tabs, parameters, and cached results to defaults.

## Localization and Formatting

- The product copy is manually authored in Spanish directly inside the components.
- There is no runtime i18n framework, locale switcher, or translation catalog.
- Number, currency, percent, and date formatting uses `es-ES` conventions.
- Date parsing normalizes naive timestamps to UTC before rendering, and formatter helpers explicitly render dates in UTC to avoid browser-local timezone drift.

## Rendering and Performance Decisions

- The app stays on one page and avoids router overhead.
- `PerformanceAuditView` samples long timelines down to a capped set of rendered bars while preserving the first point, last point, and any execution marker timestamps.
- Chart inspector updates are batched through `requestAnimationFrame` to reduce hover-driven DOM churn.
- Several Recharts series disable animation to keep interactions predictable on dense financial charts.
- Wide, data-heavy tables and comparison sections use horizontal scrolling containers instead of collapsing columns away.

## Extending the Frontend

### Add a New View

1. Create the view under `src/components/views`.
2. Add a new tab identifier to the workspace tab union used by the context and navigation.
3. Add the navigation button in `TopNavigation` with Spanish copy consistent with the existing labels.
4. Mount the view in the `WorkspaceRouter` switch inside `App.tsx`.
5. Reuse `BacktestContext` when the view depends on the active simulation, or add narrowly scoped local state when it does not need to be shared.

### Add a Reusable Component

1. Place shared panels, cards, and data widgets in `src/components`.
2. Place navigation and shell pieces in `src/components/layout`.
3. Place chart-specific shapes or glue code in `src/components/charts`.
4. Keep formatting logic in `src/utils/formatters.ts` rather than duplicating locale or UTC handling inside components.
5. Define or extend response and UI contracts in `src/types` before wiring the component to live data.

### Add a New API Call

1. Check whether the request belongs in `BacktestContext` because multiple views need the result or status.
2. If the call is view-specific, keep it inside that view and model the payload and response in `src/types`.
3. Follow the existing Axios pattern and keep the endpoint naming aligned with the backend API.
4. Surface Spanish error text to the user and avoid silent failures for primary workflows.
5. If the result should be reused, extend the existing in-memory cache strategy rather than introducing ad hoc component caches.

## Known Limitations

- No client-side router. Top-level navigation is a tab switch in `App.tsx`.
- No persistent client state. Refreshing the page clears UI state and cached results.
- No environment-configurable API URL. The frontend is currently tied to `http://127.0.0.1:8000`.
- The frontend validation view does not call `POST /walk-forward`; it combines a client-side split with a static benchmark matrix.
- Parameter changes currently re-request strategy and preset metadata because of the context effect dependencies.
- Stale-result indicators do not cover every input represented in requests or cache keys.
- Comparison requests omit `timeframe`, so the backend uses its schema default instead of the selected UI timeframe.
- No frontend test suite is present at this time.
- ESLint still reflects baseline debt in the current repo configuration and should not be treated as a strict cleanliness guarantee.
- The production bundle currently emits Vite's large chunk warning because the main JavaScript asset exceeds the default 500 kB warning threshold.
- Responsive handling for dense tables relies on horizontal scrolling rather than alternative mobile-specific table layouts.
