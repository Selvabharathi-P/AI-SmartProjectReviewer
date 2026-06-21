import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db, AsyncSessionLocal
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.meeting import Meeting, MeetingInvitee, MeetingAttendance, MeetingStatus
from app.schemas.meeting import MeetingCreate, MeetingOut, AttendanceOut
from app.integrations import zoom_client
from app.services import meeting_report

logger = logging.getLogger("meetings")
router = APIRouter(prefix="/meetings", tags=["meetings"])


def _parse_zoom_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


# ── Reviewer: create & manage ──────────────────────────────────

@router.post("/", response_model=MeetingOut, status_code=201)
async def create_meeting(
    payload: MeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    meeting = Meeting(
        reviewer_id=current_user.id,
        department_id=payload.department_id,
        topic=payload.topic,
        agenda=payload.agenda,
        scheduled_start=_naive_utc(payload.scheduled_start),
        duration_minutes=payload.duration_minutes,
        status=MeetingStatus.upcoming,
    )

    # Best-effort Zoom meeting creation. If Zoom isn't configured we still save
    # the meeting (without a join link) so the rest of the flow works.
    if zoom_client.is_configured():
        start_iso = payload.scheduled_start.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") \
            if payload.scheduled_start.tzinfo else payload.scheduled_start.strftime("%Y-%m-%dT%H:%M:%SZ")
        try:
            zm = await zoom_client.create_meeting(
                payload.topic, start_iso, payload.duration_minutes, payload.agenda
            )
            meeting.zoom_meeting_id = str(zm.get("id"))
            meeting.join_url = zm.get("join_url")
            meeting.start_url = zm.get("start_url")
        except zoom_client.ZoomError as e:
            raise HTTPException(status_code=502, detail=f"Zoom error: {e}")

    db.add(meeting)
    await db.flush()

    for sid in dict.fromkeys(payload.invitee_ids):  # dedupe, preserve order
        db.add(MeetingInvitee(meeting_id=meeting.id, student_id=sid))

    await db.commit()
    await db.refresh(meeting)
    return _serialize_meeting(meeting, invitee_count=len(set(payload.invitee_ids)), include_host_url=True)


@router.get("/", response_model=list[MeetingOut])
async def list_reviewer_meetings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    query = select(Meeting).order_by(Meeting.scheduled_start.desc())
    if current_user.role == UserRole.faculty:
        query = query.where(Meeting.reviewer_id == current_user.id)
    result = await db.execute(query)
    meetings = result.scalars().all()
    return [
        _serialize_meeting(m, invitee_count=await _invitee_count(m.id, db), include_host_url=True)
        for m in meetings
    ]


@router.get("/students")
async def list_students_for_invite(
    department_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    """Active students a reviewer can invite to a meeting."""
    query = select(User).where(User.role == UserRole.student, User.is_active.is_(True))
    if department_id is not None:
        query = query.where(User.department_id == department_id)
    result = await db.execute(query.order_by(User.full_name))
    return [
        {"id": u.id, "full_name": u.full_name, "email": u.email, "id_number": u.id_number,
         "department_id": u.department_id}
        for u in result.scalars().all()
    ]


@router.get("/my", response_model=list[MeetingOut])
async def list_student_meetings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    result = await db.execute(
        select(Meeting)
        .join(MeetingInvitee, MeetingInvitee.meeting_id == Meeting.id)
        .where(MeetingInvitee.student_id == current_user.id)
        .order_by(Meeting.scheduled_start.desc())
    )
    meetings = result.scalars().all()
    return [
        _serialize_meeting(m, invitee_count=await _invitee_count(m.id, db), include_host_url=False)
        for m in meetings
    ]


@router.patch("/{meeting_id}/status", response_model=MeetingOut)
async def update_meeting_status(
    meeting_id: int,
    status: MeetingStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    meeting = await _get_owned_meeting(meeting_id, current_user, db)
    meeting.status = status
    await db.commit()
    await db.refresh(meeting)
    return _serialize_meeting(meeting, invitee_count=await _invitee_count(meeting.id, db), include_host_url=True)


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    meeting = await _get_owned_meeting(meeting_id, current_user, db)
    await db.execute(MeetingInvitee.__table__.delete().where(MeetingInvitee.meeting_id == meeting_id))
    await db.execute(MeetingAttendance.__table__.delete().where(MeetingAttendance.meeting_id == meeting_id))
    await db.delete(meeting)
    await db.commit()


# ── Attendance: view, sync, export ─────────────────────────────

@router.get("/{meeting_id}/attendance", response_model=list[AttendanceOut])
async def get_attendance(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    await _get_owned_meeting(meeting_id, current_user, db)
    rows = await _attendance_rows(meeting_id, db)
    return [AttendanceOut.model_validate(r) for r in rows]


@router.post("/{meeting_id}/sync")
async def sync_attendance(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    """Pull the Zoom participant report (paid plan). No-op on free plans."""
    meeting = await _get_owned_meeting(meeting_id, current_user, db)
    if not meeting.zoom_meeting_id:
        raise HTTPException(status_code=400, detail="Meeting has no Zoom meeting id")
    participants = await zoom_client.get_participants_report(meeting.zoom_meeting_id)
    if participants is None:
        return {"synced": 0, "detail": "Zoom report API unavailable (paid plan required). Webhook data is used instead."}

    count = 0
    for p in participants:
        email = (p.get("user_email") or "").lower() or None
        student_id = await _match_student(meeting_id, email, db)
        await _upsert_attendance(
            db, meeting_id, student_id, email, p.get("name"),
            p.get("registrant_id") or p.get("id"),
            join_time=_parse_zoom_dt(p.get("join_time")),
            leave_time=_parse_zoom_dt(p.get("leave_time")),
            duration_sec=int(p.get("duration") or 0),
            source="zoom",
        )
        count += 1
    await db.commit()
    return {"synced": count}


@router.get("/{meeting_id}/report")
async def export_report(
    meeting_id: int,
    format: str = Query("xlsx", pattern="^(xlsx|pdf)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty, UserRole.admin)),
):
    meeting = await _get_owned_meeting(meeting_id, current_user, db)
    rows = await _attendance_rows(meeting_id, db)
    if format == "pdf":
        data = meeting_report.build_pdf(meeting, rows)
        media = "application/pdf"
        ext = "pdf"
    else:
        data = meeting_report.build_excel(meeting, rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    filename = f"attendance_meeting_{meeting_id}.{ext}"
    return StreamingResponse(
        iter([data]),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Student: app-side join/leave fallback ──────────────────────

@router.post("/{meeting_id}/join")
async def student_join(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    await _require_invited(meeting_id, current_user, db)
    row = await _get_app_attendance(meeting_id, current_user.id, db)
    now = datetime.now(timezone.utc)
    if not row:
        row = MeetingAttendance(
            meeting_id=meeting_id, student_id=current_user.id,
            participant_email=current_user.email, participant_name=current_user.full_name,
            join_time=_naive_utc(now), source="app",
        )
        db.add(row)
    elif row.join_time is None:
        row.join_time = _naive_utc(now)
    await db.commit()
    return {"joined": True}


@router.post("/{meeting_id}/leave")
async def student_leave(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.student)),
):
    row = await _get_app_attendance(meeting_id, current_user.id, db)
    if row and row.join_time:
        now = datetime.now(timezone.utc)
        row.leave_time = _naive_utc(now)
        delta = int((now - _aware(row.join_time)).total_seconds())
        row.attendance_duration_sec = max(row.attendance_duration_sec or 0, delta)
        await db.commit()
    return {"left": True}


# ── Zoom webhook ───────────────────────────────────────────────

@router.post("/zoom/webhook")
async def zoom_webhook(request: Request):
    raw = await request.body()
    if not zoom_client.verify_webhook_signature(
        raw, request.headers.get("x-zm-signature"), request.headers.get("x-zm-request-timestamp")
    ):
        raise HTTPException(status_code=401, detail="Invalid signature")

    body = await request.json()
    event = body.get("event")
    obj = body.get("payload", {}).get("object", {})

    if event == "endpoint.url_validation":
        return JSONResponse(zoom_client.url_validation_response(body["payload"]["plainToken"]))

    # Use a dedicated session — webhooks run outside the request auth flow.
    async with AsyncSessionLocal() as db:
        await _handle_zoom_event(event, obj, db)
    return {"ok": True}


async def _handle_zoom_event(event: str, obj: dict, db: AsyncSession) -> None:
    zoom_meeting_id = str(obj.get("id")) if obj.get("id") is not None else None
    if not zoom_meeting_id:
        return
    meeting = (
        await db.execute(select(Meeting).where(Meeting.zoom_meeting_id == zoom_meeting_id))
    ).scalar_one_or_none()
    if not meeting:
        return

    if event == "meeting.started":
        meeting.status = MeetingStatus.active
        await db.commit()
        return
    if event == "meeting.ended":
        meeting.status = MeetingStatus.completed
        await db.commit()
        return

    participant = obj.get("participant", {})
    email = (participant.get("email") or "").lower() or None
    uuid = participant.get("participant_uuid") or participant.get("id")
    name = participant.get("user_name")

    if event == "meeting.participant_joined":
        student_id = await _match_student(meeting.id, email, db)
        row = await _get_zoom_attendance(meeting.id, uuid, db)
        jt = _naive_utc(_parse_zoom_dt(participant.get("join_time")) or datetime.now(timezone.utc))
        if not row:
            db.add(MeetingAttendance(
                meeting_id=meeting.id, student_id=student_id, participant_email=email,
                participant_name=name, zoom_participant_uuid=uuid, join_time=jt, source="zoom",
            ))
        else:
            row.join_time = jt
        await db.commit()

    elif event == "meeting.participant_left":
        row = await _get_zoom_attendance(meeting.id, uuid, db)
        if row:
            lt = _naive_utc(_parse_zoom_dt(participant.get("leave_time")) or datetime.now(timezone.utc))
            row.leave_time = lt
            if row.join_time:
                row.attendance_duration_sec = (row.attendance_duration_sec or 0) + max(
                    0, int((_aware(lt) - _aware(row.join_time)).total_seconds())
                )
            await db.commit()

    elif event == "meeting.sharing_started":
        row = await _get_zoom_attendance(meeting.id, uuid, db)
        if row:
            row.presentation_started_at = _naive_utc(_parse_zoom_dt(
                obj.get("date_time") or participant.get("sharing_details", {}).get("date")
            ) or datetime.now(timezone.utc))
            await db.commit()

    elif event == "meeting.sharing_ended":
        row = await _get_zoom_attendance(meeting.id, uuid, db)
        if row and row.presentation_started_at:
            end = datetime.now(timezone.utc)
            row.presentation_duration_sec = (row.presentation_duration_sec or 0) + max(
                0, int((end - _aware(row.presentation_started_at)).total_seconds())
            )
            row.presentation_started_at = None
            await db.commit()


# ── helpers ────────────────────────────────────────────────────

def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _naive_utc(dt: datetime | None) -> datetime | None:
    """DB columns are TIMESTAMP WITHOUT TIME ZONE — store naive UTC."""
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt


async def _get_owned_meeting(meeting_id: int, user: User, db: AsyncSession) -> Meeting:
    meeting = (await db.execute(select(Meeting).where(Meeting.id == meeting_id))).scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if user.role == UserRole.faculty and meeting.reviewer_id != user.id:
        raise HTTPException(status_code=403, detail="Not your meeting")
    return meeting


async def _require_invited(meeting_id: int, user: User, db: AsyncSession) -> None:
    inv = (await db.execute(
        select(MeetingInvitee).where(
            MeetingInvitee.meeting_id == meeting_id, MeetingInvitee.student_id == user.id
        )
    )).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=403, detail="You are not invited to this meeting")


async def _invitee_count(meeting_id: int, db: AsyncSession) -> int:
    return (await db.execute(
        select(func.count(MeetingInvitee.id)).where(MeetingInvitee.meeting_id == meeting_id)
    )).scalar() or 0


async def _attendance_rows(meeting_id: int, db: AsyncSession) -> list[MeetingAttendance]:
    result = await db.execute(
        select(MeetingAttendance).where(MeetingAttendance.meeting_id == meeting_id)
        .order_by(MeetingAttendance.join_time)
    )
    return list(result.scalars().all())


async def _match_student(meeting_id: int, email: str | None, db: AsyncSession) -> int | None:
    if not email:
        return None
    user = (await db.execute(select(User).where(func.lower(User.email) == email))).scalar_one_or_none()
    return user.id if user else None


async def _get_app_attendance(meeting_id: int, student_id: int, db: AsyncSession) -> MeetingAttendance | None:
    return (await db.execute(
        select(MeetingAttendance).where(
            MeetingAttendance.meeting_id == meeting_id,
            MeetingAttendance.student_id == student_id,
            MeetingAttendance.source == "app",
        )
    )).scalar_one_or_none()


async def _get_zoom_attendance(meeting_id: int, uuid: str | None, db: AsyncSession) -> MeetingAttendance | None:
    if not uuid:
        return None
    return (await db.execute(
        select(MeetingAttendance).where(
            MeetingAttendance.meeting_id == meeting_id,
            MeetingAttendance.zoom_participant_uuid == uuid,
        )
    )).scalar_one_or_none()


async def _upsert_attendance(db, meeting_id, student_id, email, name, uuid,
                             join_time, leave_time, duration_sec, source):
    row = await _get_zoom_attendance(meeting_id, uuid, db)
    if not row:
        row = MeetingAttendance(meeting_id=meeting_id, zoom_participant_uuid=uuid, source=source)
        db.add(row)
    row.student_id = student_id
    row.participant_email = email
    row.participant_name = name
    row.join_time = _naive_utc(join_time)
    row.leave_time = _naive_utc(leave_time)
    row.attendance_duration_sec = duration_sec


def _serialize_meeting(m: Meeting, invitee_count: int, include_host_url: bool) -> dict:
    return {
        "id": m.id,
        "reviewer_id": m.reviewer_id,
        "department_id": m.department_id,
        "topic": m.topic,
        "agenda": m.agenda,
        "scheduled_start": m.scheduled_start,
        "duration_minutes": m.duration_minutes,
        "status": m.status,
        "zoom_meeting_id": m.zoom_meeting_id,
        "join_url": m.join_url,
        "start_url": m.start_url if include_host_url else None,
        "invitee_count": invitee_count,
        "created_at": m.created_at,
    }
