from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, HTMLResponse

router = APIRouter()

TEMPLATE_PATH = Path(__file__).resolve().with_name("scenario.html")


@router.get("/ui/scenario", response_class=HTMLResponse)
async def scenario_ui():
    if not TEMPLATE_PATH.exists():
        return HTMLResponse("<h1>Scenario UI missing</h1>", status_code=500)
    return FileResponse(TEMPLATE_PATH)
