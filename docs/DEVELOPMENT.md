# Simetrix Frontend Developer Guide

This document captures the steps a new teammate needs to get the dashboard running locally, understand the auth/key expectations, and ship changes safely.

## 1. Prerequisites

- **Node.js** 18+ (18.18 or later recommended).
- **NPM** 9+ (ships with modern Node).
- **Python** 3.10+ if you also work on the FastAPI backend (run from the adjacent backend repo).
- **Redis** (optional for local backend jobs; required if you need full pipeline parity).

## 2. Environment Configuration

Create `simetrix-frontend/.env.local` (never commit this file) with at least the following keys. Temporary dev values are fine; swap them for your own accounts as needed.

```ini
VITE_API_BASE=http://localhost:8000
VITE_PT_API_KEY=dev-local
VITE_POLYGON_API_KEY=your_polygon_key_here
```

**Notes**
- `VITE_API_BASE` must point at the FastAPI instance; every fetch in the app uses this base through `resolveApiBase()`.
- `VITE_PT_API_KEY` is forwarded as `X-API-Key` in request headers. For legacy configs you can still provide `VITE_API_KEY`, but the app now expects the PT key everywhere (localStorage entry `pt_api_key`, Admin panel, etc.).
- `VITE_POLYGON_API_KEY` powers browser-side ticker search and news lookups. You can alternatively set `localStorage.setItem('polygon_api_key', '...')` while testing, but keeping the env value is easier.

Restart Vite (`npm run dev`) whenever you change these values so the build picks them up.

## 3. Running the App Locally

```bash
# install dependencies (one-time)
npm install

# start the Vite dev server (http://localhost:5173)
npm run dev
```

In parallel, start the backend (assuming the FastAPI project lives at `../simetrix-backend`):

```bash
cd ../simetrix-backend
poetry install  # or pip install -r requirements.txt
export PT_OPEN_ACCESS=1
uvicorn simetrix.api.main:app --reload --host 0.0.0.0 --port 8000
```

Optional helpers:
- `npm run lint` – run ESLint over the client.
- `npm run build` – verify the production bundle compiles cleanly.

## 4. Structured Logging & Telemetry

The frontend now emits structured telemetry events (via `/telemetry/events`) for major pipeline phases:

- Training failures and timeouts (`phase: "train"`)
- Streaming/SSE errors (`phase: "stream"`)
- Artifact polling issues (parse errors, 202 retries, timeouts) (`phase: "artifact"`)
- Status/summary fetch errors (`phase: "status"` / `"summary"`)
- Prediction success and failure (`phase: "predict"`)
- Simulation completion (`phase: "summary"`)

Events fall back to `console.error/warn/log` if the telemetry endpoint returns an error, so you still see the payloads even if observability is offline. Hook the backend `/telemetry/events` handler into your logging/metrics stack (e.g., ship to OpenTelemetry, CloudWatch, etc.) to alert before customers spot issues such as Polygon outages or earnings 404s.

## 5. Deployment Checklist

1. **Tests / Build**
   - `npm run lint`
   - `npm run build`
2. **Secrets**
   - Ensure `VITE_API_BASE`, `VITE_PT_API_KEY`, and `VITE_POLYGON_API_KEY` are configured in the deployment environment (CI/CD, Vercel, etc.). Provide `VITE_API_KEY` only if you have older builds that still read it.
   - Rotate temp keys to production values.
3. **Backend readiness**
   - Confirm FastAPI `/ready` reports healthy (checks for Polygon key, Redis, etc.).
   - Verify `/telemetry/events` ingestion is connected to your logging system.
4. **Rollback plan**
   - Keep the previous build artifact handy or use your platform’s built-in rollback if telemetry surfaces a spike in `phase: "artifact"` or `phase: "status"` errors.

## 6. Troubleshooting

- **Failed to fetch / HTML response**: usually `VITE_API_BASE` is missing or the backend isn’t running. Update `.env.local` and restart Vite.
- **Ticker search disabled**: set `VITE_POLYGON_API_KEY` (or populate `localStorage.polygon_api_key`).
- **News card blank**: check the dev console for telemetry logs (`phase: "artifact"` or `"status"`). Most often Polygon rate limits or backend 500s show up there now.
- **Telemetry endpoint missing**: the client logs a warning/error to `console` whenever `/telemetry/events` is unreachable. Wire up the backend handler or stub it out in dev if you don’t need the data.

---

For any additional workflow nuances, see `README.md` or reach out in `#simetrix-dev`. When in doubt, run with `npm run dev -- --host` to test across devices and watch the Activity Log + telemetry output for early hints of backend issues.
