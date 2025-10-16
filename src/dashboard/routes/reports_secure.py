from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.concurrency import run_in_threadpool

from src.reports.generator import (
    ExportFormat,
    ReportRequest,
    ReportType,
    build_report,
    export_payload,
)

router = APIRouter(prefix="/reports", tags=["reports-secure"])

_ADMIN_TOKEN_ENV = "REPORTS_ADMIN_TOKEN"
_ADMIN_HEADER = "X-Admin-Token"
_REPORTS_DIR = Path(os.environ.get("REPORTS_DIR", "reports")).resolve()


def _check_token(request: Request) -> None:
    expected = os.environ.get(_ADMIN_TOKEN_ENV)
    provided = request.headers.get(_ADMIN_HEADER)
    if not expected or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token")


def _ensure_reports_dir() -> None:
    _REPORTS_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/generate")
async def generate_report(
    request: Request,
    rtype: ReportType = Query(default=ReportType.full),
    fmt: ExportFormat = Query(default=ExportFormat.json),
    tickers: Optional[List[str]] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    include_raw: bool = Query(default=False),
    save: bool = Query(default=False),
):
    _check_token(request)

    req = ReportRequest(
        report_type=rtype,
        tickers=tickers,
        date_from=date_from,
        date_to=date_to,
        include_raw=include_raw,
    )

    payload = await run_in_threadpool(build_report, req)
    filename, blob, mime = await run_in_threadpool(export_payload, payload, fmt)

    if save:
        _ensure_reports_dir()
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        outname = f"{ts}_{filename}"
        (_REPORTS_DIR / outname).write_bytes(blob)

    return Response(
        content=blob,
        media_type=mime,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/recent")
async def recent_reports(request: Request):
    _check_token(request)

    if not _REPORTS_DIR.exists():
        return []

    items = []
    for path in sorted(
        _REPORTS_DIR.glob("*"),
        key=lambda entry: entry.stat().st_mtime,
        reverse=True,
    )[:50]:
        meta = path.stat()
        items.append(
            {
                "name": path.name,
                "size": meta.st_size,
                "mtime": datetime.fromtimestamp(meta.st_mtime).isoformat(),
                "url": f"/reports/file/{path.name}",
            }
        )
    return items


@router.get("/file/{name}")
async def get_report_file(request: Request, name: str):
    _check_token(request)

    safe_name = Path(name).name
    path = _REPORTS_DIR / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    ext = path.suffix.lower()
    mime = "application/octet-stream"
    if ext == ".json":
        mime = "application/json"
    elif ext == ".csv":
        mime = "text/csv"
    elif ext == ".pdf":
        mime = "application/pdf"

    return Response(
        content=path.read_bytes(),
        media_type=mime,
        headers={"Content-Disposition": f"attachment; filename={path.name}"},
    )
