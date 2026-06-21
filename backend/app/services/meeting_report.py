"""Build attendance reports (Excel / PDF) for a meeting."""
import io
from datetime import datetime

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.models.meeting import Meeting, MeetingAttendance


def _fmt_dt(dt: datetime | None) -> str:
    return dt.strftime("%Y-%m-%d %H:%M") if dt else "—"


def _fmt_dur(seconds: int) -> str:
    seconds = int(seconds or 0)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h {m}m"
    if m:
        return f"{m}m {s}s"
    return f"{s}s"


HEADERS = ["Name", "Email", "Join time", "Leave time", "Attendance", "Presentation", "Source"]


def _row(a: MeetingAttendance) -> list[str]:
    return [
        a.participant_name or "—",
        a.participant_email or "—",
        _fmt_dt(a.join_time),
        _fmt_dt(a.leave_time),
        _fmt_dur(a.attendance_duration_sec),
        _fmt_dur(a.presentation_duration_sec),
        a.source,
    ]


def build_excel(meeting: Meeting, rows: list[MeetingAttendance]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance"
    ws.append([f"Attendance — {meeting.topic}"])
    ws.append([f"Scheduled: {_fmt_dt(meeting.scheduled_start)}", f"Status: {meeting.status.value}"])
    ws.append([])
    ws.append(HEADERS)
    for a in rows:
        ws.append(_row(a))
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_pdf(meeting: Meeting, rows: list[MeetingAttendance]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(f"Attendance Report — {meeting.topic}", styles["Title"]),
        Paragraph(
            f"Scheduled: {_fmt_dt(meeting.scheduled_start)} &nbsp;&nbsp; Status: {meeting.status.value}",
            styles["Normal"],
        ),
        Spacer(1, 8 * mm),
    ]
    data = [HEADERS] + [_row(a) for a in rows]
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    elements.append(table)
    if not rows:
        elements.append(Paragraph("No attendance recorded.", styles["Italic"]))
    doc.build(elements)
    return buf.getvalue()
