# src/market_twin/dashboard/routes/reports.py
from __future__ import annotations

from fastapi import APIRouter, Query, Response
from typing import List, Optional
from datetime import datetime

from src.reports.generator import (
    ReportType,
    ExportFormat,
    ReportRequest,
    build_report,
    export_payload,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/generate")
async def generate_report(
    rtype: ReportType = Query(default=ReportType.full),
    fmt: ExportFormat = Query(default=ExportFormat.json),
    tickers: Optional[List[str]] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    include_raw: bool = Query(default=False),
):
    req = ReportRequest(
        report_type=rtype,
        tickers=tickers,
        date_from=date_from,
        date_to=date_to,
        include_raw=include_raw,
    )
    payload = build_report(req)
    filename, blob, mime = export_payload(payload, fmt)
    return Response(
        content=blob,
        media_type=mime,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ---------- Optional: tiny daily scheduler (safe if missing) ----------
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from datetime import datetime as _dt
    import os

    _scheduler: Optional[AsyncIOScheduler] = None

    def schedule_daily_report(hour: int = 21, minute: int = 0, tz: str = "America/Denver"):
        """Schedules a daily full JSON report to ./reports/"""
        global _scheduler
        if _scheduler is None:
            _scheduler = AsyncIOScheduler()
            _scheduler.start()

        os.makedirs("reports", exist_ok=True)

        async def job():
            req = ReportRequest(report_type=ReportType.full)
            payload = build_report(req)
            name, blob, _ = export_payload(payload, ExportFormat.json)
            ts = _dt.now().strftime("%Y%m%d_%H%M")
            with open(f"reports/{ts}_{name}", "wb") as f:
                f.write(blob)

        _scheduler.add_job(
            job,
            "cron",
            hour=hour,
            minute=minute,
            timezone=tz,
            id="daily_full_report",
            replace_existing=True,
        )
        return True

except Exception:
    # If APScheduler isn't installed, expose a no-op so app imports don't crash
    def schedule_daily_report(*args, **kwargs):
        return False
