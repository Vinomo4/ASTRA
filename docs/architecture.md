# Architecture

This project uses an event-driven trading pipeline:

1. Ingest and store market data locally.
2. Build features and regime filters.
3. Generate strategy signals.
4. Filter or enrich them with ML.
5. Size and protect positions through the risk engine.
6. Simulate fills in the execution engine.
7. Expose portfolio metrics through FastAPI and render them in the Vite web frontend.
