from __future__ import annotations
from fastapi import APIRouter
from fastapi.responses import FileResponse, HTMLResponse
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional

router = APIRouter()

@router.get("/ui/reports", response_class=HTMLResponse)
async def reports_ui():
    # Serve the static HTML template
    here = Path(__file__).resolve()
    tpl = here.parent.parent / "templates" / "reports.html"
    return FileResponse(tpl)