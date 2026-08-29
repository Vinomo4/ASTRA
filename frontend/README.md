# ASTRA Quantitative Workstation (Frontend)

The ASTRA Frontend is the primary operator workspace for the ASTRA algorithmic framework. It provides a single-page, high-performance React application designed for configuring simulations, inspecting trade executions and price action, auditing Monte Carlo risk distributions, validating temporal persistency (Walk-Forward / OOS), and executing multi-strategy performance attribution against buy-and-hold benchmarks.

This document complements the core architecture documentation in [../docs/architecture.md](../docs/architecture.md) and the quantitative research foundation in [../docs/methodology.md](../docs/methodology.md).

## Technology Stack

- **Core Framework & Runtime:** React 19, TypeScript 6, Vite 8
- **Data Visualization Engine:** Recharts (custom SVG shapes, synchronized cursor bridges, and dynamic timeline rendering)
- **Styling & Design System:** Tailwind CSS 4, Lucide React icons
- **State Management & Caching:** React Context API, Composite In-Memory Backtest Cache
- **HTTP Client:** Axios (REST integration with FastAPI backend)
- **Code Quality:** ESLint with strict TypeScript rules

## Prerequisites

- **Node.js:** `^20.19.0` or `>=22.12.0` (aligned with Vite 8 requirements)
- **Package Manager:** `npm`
- **ASTRA Backend:** Running locally at `http://127.0.0.1:8000`

## Build & Tooling Scripts

From the `frontend` directory, the following commands are available:

```bash
# Install exact dependency tree
npm ci

# Start Vite development server with HMR (Hot Module Replacement)
npm run dev

# Compile TypeScript and generate optimized production bundle
npm run build

# Run linter across the entire TypeScript/TSX codebase
npm run lint

# Locally preview the compiled production build
npm run preview
```

## Local Setup & Quick Start

1. Start the ASTRA backend engine first and verify that the API is active at `http://127.0.0.1:8000`.
2. Install frontend dependencies:
   ```bash
   npm ci
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
4. Access the interface in your browser at `http://localhost:5173`.

---

## Architectural Design

The application is structured around a centralized state provider (`BacktestContext`) and a lightweight workspace router, avoiding unnecessary client-side routing overhead and maintaining atomic synchronization between data streams and visual inspectors.

```
frontend/src/
├── components/
│   ├── charts/             # Custom SVG shapes (Candlesticks, Execution Markers, Fast Tooltip Bridge)
│   ├── layout/             # Global shell (TopNavigation, GlobalControlRibbon, AssetPickerModal)
│   ├── views/              # Top-level analytical workspaces (Studio, Performance, Stress, Validation, Compare)
│   ├── ActivePositionBanner.tsx
│   ├── KPIGrid.tsx
│   ├── SynchronizedInspector.tsx
│   ├── TradeAnalyticsPanel.tsx
│   └── TradeAuditTable.tsx
├── context/
│   └── BacktestContext.tsx # Central store: simulation parameters, results cache, and API lifecycle
├── types/
│   └── index.ts            # Typed interfaces for market data, strategies, metrics, and API payloads
├── utils/
│   └── formatters.ts       # Numerical, currency, percentage, and UTC date formatters
├── App.tsx                 # Application root & tab-based workspace router
└── main.tsx                # React root bootstrap
```

### Core Analytical Workspaces

| Workspace | Internal ID | Core Analytical Capability |
| :--- | :--- | :--- |
| **Strategy Studio** | `studio` | Strategy catalog selection, parameter fine-tuning, AST visual condition builder, risk sizing ($k_{SL}, k_{TP}$), and broker friction modeling. |
| **Performance Audit** | `performance` | Synchronized OHLCV candlestick chart, trade execution markers, dynamic equity curve vs. benchmark, and granular transaction audit table. |
| **Stress Testing & MC** | `stress_testing` | Non-parametric Bootstrap Monte Carlo (1,000 runs), confidence intervals, empirical VaR/CVaR, and probability of ruin. |
| **Walk-Forward & OOS** | `validation` | Temporal In-Sample / Out-of-Sample partitioning (WFER efficiency ratio) and interactive 24-configuration benchmark degradation matrix. |
| **Model Benchmark** | `comparison` | Head-to-head multi-model comparison, statistical alpha spread calculation ($\Delta A - B$), and overlaid equity trajectories. |

---

## State Management & In-Memory Caching

- **Unified Context:** `BacktestContext` acts as the single source of truth for backtest parameters, execution state, active positions, and server responses.
- **Deterministic Composite Caching:** Backtest results are indexed using a deterministic multi-variable key:
  $$\text{CacheKey} = \text{Symbol} \mid \text{Timeframe} \mid \text{Dates} \mid \text{StrategyID} \mid \text{Capital} \mid \text{RiskParams} \mid \text{Frictions} \mid \text{MCParams} \mid \text{SerializedParams}$$
  Repeated executions with identical parameter configurations resolve instantly in $<1\text{ ms}$ from memory without generating network overhead.
- **Dynamic Stale Detection:** Visual badges notify the operator when active parameters have diverged from the currently rendered analytical charts.

---

## Rendering Performance & Optimization

- **High-Frequency Viewport Optimization:** `PerformanceAuditView` isolates timeline slices and optimizes rendering cycles to sustain 60 FPS performance when inspecting multi-year intraday datasets (e.g., $>6,500$ bars in 4h resolution).
- **Decoupled DOM Tooltip Bridge:** Chart crosshairs and synchronized inspector updates bypass React reconciliation cycles during mousemove events by batching direct DOM mutations through `requestAnimationFrame`.
- **Strict UTC Normalization:** Market timestamps and trade execution logs are strictly parsed and formatted in UTC (`es-ES` numeric standards), eliminating browser-local timezone drift across global assets.

---

## API Integration Contract

All client communications target the FastAPI backend via typed REST endpoints:

| Method | Endpoint | Invoked By | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/backtest/strategies` | `BacktestContext` | Fetches registered strategy metadata and parameter definitions. |
| `GET` | `/api/backtest/presets` | `BacktestContext` | Retrieves stored user profiles and custom parameter configurations. |
| `POST` | `/api/backtest/run` | `BacktestContext` | Executes an event-driven backtest and returns full OHLCV, equity, and trade metrics. |
| `POST` | `/api/backtest/presets` | `StrategyStudioView` | Persists a strategy configuration and friction profile to disk. |
| `DELETE` | `/api/backtest/presets/:name` | `StrategyStudioView` | Deletes a persistent user preset by identifier. |
| `POST` | `/api/backtest/compare` | `ModelComparisonView` | Executes concurrent multi-strategy simulations for alpha attribution. |
| `POST` | `/api/backtest/oos-audit` | `WalkForwardView` | Computes dynamic In-Sample / Out-of-Sample metrics and WFER degradation. |

---

## Extending the Platform

### Adding a New Analytical View
1. Create the component under `src/components/views/YourNewView.tsx`.
2. Register the tab key in `WorkspaceTab` (`src/context/BacktestContext.tsx`).
3. Add the navigation trigger in `src/components/layout/TopNavigation.tsx`.
4. Mount the view in the workspace switch inside `src/App.tsx`.

### Adding a Reusable Financial Component
1. Place shared panels, metric widgets, or tables in `src/components/`.
2. Reuse existing formatters from `src/utils/formatters.ts` to ensure consistent numerical representation.
3. Bind TypeScript contracts from `src/types/index.ts` to enforce strict type safety across props.