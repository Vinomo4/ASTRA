export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Trading Bot TFM</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-white md:text-7xl">
            Quant engine on the backend, trading cockpit in the browser.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            FastAPI handles backtests, market data, and WebSocket telemetry while the Vite frontend
            presents charts, controls, and portfolio metrics.
          </p>
        </div>
      </section>
    </main>
  )
}
