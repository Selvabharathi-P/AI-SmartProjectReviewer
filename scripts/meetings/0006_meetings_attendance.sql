-- M4: Meetings, invitees, attendance (Zoom integration).
-- Idempotent / additive. New tables only — safe on any existing database.
-- (The running app also auto-creates these via create_all at startup.)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meetingstatus') THEN
        CREATE TYPE meetingstatus AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    topic VARCHAR NOT NULL,
    agenda TEXT,
    scheduled_start TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status meetingstatus NOT NULL DEFAULT 'upcoming',
    zoom_meeting_id VARCHAR,
    join_url VARCHAR,
    start_url TEXT,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_meetings_zoom_meeting_id ON meetings(zoom_meeting_id);

CREATE TABLE IF NOT EXISTS meeting_invitees (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(id),
    student_id INTEGER NOT NULL REFERENCES users(id),
    CONSTRAINT uq_meeting_invitee UNIQUE (meeting_id, student_id)
);
CREATE INDEX IF NOT EXISTS ix_meeting_invitees_meeting_id ON meeting_invitees(meeting_id);
CREATE INDEX IF NOT EXISTS ix_meeting_invitees_student_id ON meeting_invitees(student_id);

CREATE TABLE IF NOT EXISTS meeting_attendance (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(id),
    student_id INTEGER REFERENCES users(id),
    participant_email VARCHAR,
    participant_name VARCHAR,
    zoom_participant_uuid VARCHAR,
    join_time TIMESTAMP,
    leave_time TIMESTAMP,
    attendance_duration_sec INTEGER NOT NULL DEFAULT 0,
    presentation_duration_sec INTEGER NOT NULL DEFAULT 0,
    presentation_started_at TIMESTAMP,
    source VARCHAR NOT NULL DEFAULT 'zoom',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_meeting_attendance_meeting_id ON meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS ix_meeting_attendance_student_id ON meeting_attendance(student_id);
CREATE INDEX IF NOT EXISTS ix_meeting_attendance_uuid ON meeting_attendance(zoom_participant_uuid);
