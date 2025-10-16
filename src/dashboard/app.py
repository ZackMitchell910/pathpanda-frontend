from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List
import sys

import pandas as pd
from fastapi import Body, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, Response

ROOT_PATH = Path(__file__).resolve().parents[2]
if str(ROOT_PATH) not in sys.path:
    sys.path.append(str(ROOT_PATH))

from src.api.sim import router as sim_router
from src.dashboard.routes import reports as reports_routes
from src.dashboard.routes import reports_ui as reports_ui_routes
from src.dashboard.routes import scenario_ui as scenario_ui_routes

app = FastAPI(title="Market Simulator Dashboard")
app.include_router(sim_router, prefix="/api")
app.include_router(reports_routes.router)
app.include_router(reports_ui_routes.router)
app.include_router(scenario_ui_routes.router)

try:
    from src.dashboard.routes import reports_secure as reports_secure_routes  # type: ignore

    app.include_router(reports_secure_routes.router, prefix="/admin")
except Exception:  # pragma: no cover - optional dependency
    print("[WARN] Secure reports routes unavailable; admin endpoints disabled.")


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/ingest")
async def ingest_event(payload: Dict[str, Any] | List[Dict[str, Any]] = Body(...)):
    try:
        if isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict):
                    await manager.broadcast(item)
        elif isinstance(payload, dict):
            await manager.broadcast(payload)
        else:
            return {"status": "ignored"}
        return {"status": "ok"}
    except Exception as exc:
        print(f"[WARN] ingest failed: {exc}")
        return JSONResponse({"status": "error", "detail": str(exc)}, status_code=200)


@app.get("/")
async def home():
    scenario_template = Path(__file__).resolve().with_name("scenario.html")
    if scenario_template.exists():
        return HTMLResponse(scenario_template.read_text(encoding="utf-8"))
    index_html = Path(__file__).parent / "index.html"
    if index_html.exists():
        return HTMLResponse(index_html.read_text(encoding="utf-8"))
    return HTMLResponse(
        "<h1>Market Simulator Dashboard</h1><p>Drop a built dashboard bundle under src/dashboard/.</p>"
    )


@app.get("/favicon.ico")
async def favicon():
    return Response(content=b"", media_type="image/x-icon")


@app.get("/gamma")
async def gamma():
    gamma_path = Path(os.path.expanduser("~")) / ".market_twin_cache" / "options" / "gamma_seed.csv"
    if not gamma_path.exists():
        return {"rows": []}
    try:
        df = pd.read_csv(gamma_path)
        df.columns = [col.strip().lower() for col in df.columns]
        rows = df.dropna(subset=["symbol", "gamma_notional"]).to_dict(orient="records")
        return {"rows": rows}
    except Exception as exc:
        return {"rows": [], "error": str(exc)}
