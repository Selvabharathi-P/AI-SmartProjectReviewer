"use client";
import { useState } from "react";
import {
  useReviewerMeetings,
  useCreateMeeting,
  useUpdateMeetingStatus,
  useDeleteMeeting,
  useInvitableStudents,
  useMeetingAttendance,
  useSyncAttendance,
  useHostJoin,
  downloadAttendanceReport,
  type CreateMeetingData,
} from "@/hooks/useMeetings";
import { useToast } from "@/hooks/useToast";
import { PageLoader } from "@/components/shared/Spinner";
import { Video, Plus, Trash2, FileSpreadsheet, FileText, RefreshCw, ExternalLink, Users, Calendar, Clock, X } from "lucide-react";
import type { Meeting, MeetingStatus } from "@/types";

const STATUS_COLORS: Record<MeetingStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

function fmtDur(sec: number): string {
  sec = sec || 0;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export default function FacultyMeetingsPage() {
  const { data: meetings, isLoading } = useReviewerMeetings();
  const { mutateAsync: updateStatus } = useUpdateMeetingStatus();
  const { mutateAsync: deleteMeeting } = useDeleteMeeting();
  const { mutateAsync: hostJoin } = useHostJoin();
  const toast = useToast();

  const handleStart = async (m: Meeting) => {
    if (!m.start_url) return;
    try {
      await hostJoin(m.id);
    } catch {
      /* attendance is best-effort; still let them start */
    }
    window.open(m.start_url, "_blank", "noopener,noreferrer");
  };
  const [showCreate, setShowCreate] = useState(false);
  const [attendanceFor, setAttendanceFor] = useState<Meeting | null>(null);

  const handleDelete = async (m: Meeting) => {
    if (!confirm(`Delete meeting "${m.topic}"? Attendance records will be removed.`)) return;
    try {
      await deleteMeeting(m.id);
      toast.success("Meeting deleted");
    } catch {
      toast.error("Failed to delete meeting");
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Review Meetings</h1>
          <p className="text-gray-500 mt-1">Schedule Zoom review meetings and track attendance</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Schedule meeting
        </button>
      </div>

      {isLoading && <PageLoader />}

      {!isLoading && meetings?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Video size={40} className="mx-auto mb-3 opacity-40" />
          <p>No meetings scheduled yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meetings?.map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-800 text-sm pr-3">{m.topic}</h3>
              <select
                value={m.status}
                onChange={async (e) => {
                  try {
                    await updateStatus({ id: m.id, status: e.target.value as MeetingStatus });
                    toast.success("Status updated");
                  } catch {
                    toast.error("Failed to update status");
                  }
                }}
                className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[m.status]}`}
              >
                <option value="upcoming">upcoming</option>
                <option value="active">active</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
              <span className="flex items-center gap-1"><Calendar size={12} />{new Date(m.scheduled_start).toLocaleString()}</span>
              <span className="flex items-center gap-1"><Clock size={12} />{m.duration_minutes}m</span>
              <span className="flex items-center gap-1"><Users size={12} />{m.invitee_count} invited</span>
            </div>

            {!m.zoom_meeting_id && (
              <p className="text-xs text-amber-600 mb-3">⚠ No Zoom link — set Zoom credentials in the backend env.</p>
            )}

            <div className="flex flex-wrap gap-2">
              {m.start_url && (
                <button onClick={() => handleStart(m)}
                   className="flex items-center gap-1 text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                  <Video size={13} /> Start <ExternalLink size={11} />
                </button>
              )}
              <button onClick={() => setAttendanceFor(m)}
                      className="flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                <Users size={13} /> Attendance
              </button>
              <button onClick={() => downloadAttendanceReport(m.id, "xlsx")}
                      className="flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button onClick={() => downloadAttendanceReport(m.id, "pdf")}
                      className="flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                <FileText size={13} /> PDF
              </button>
              <button onClick={() => handleDelete(m)} title="Delete"
                      className="flex items-center text-xs text-gray-300 hover:text-red-500 px-2 py-1.5">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateMeetingModal onClose={() => setShowCreate(false)} />}
      {attendanceFor && <AttendanceModal meeting={attendanceFor} onClose={() => setAttendanceFor(null)} />}
    </div>
  );
}

function CreateMeetingModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync: createMeeting, isPending } = useCreateMeeting();
  const { data: students } = useInvitableStudents();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [agenda, setAgenda] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(60);
  const [invitees, setInvitees] = useState<number[]>([]);

  const toggle = (id: number) =>
    setInvitees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!start) {
      toast.error("Pick a start time");
      return;
    }
    const data: CreateMeetingData = {
      topic,
      agenda: agenda || undefined,
      scheduled_start: new Date(start).toISOString(),
      duration_minutes: duration,
      invitee_ids: invitees,
    };
    try {
      await createMeeting(data);
      toast.success("Meeting scheduled");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to schedule meeting");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Schedule meeting</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Topic</label>
            <input required value={topic} onChange={(e) => setTopic(e.target.value)}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agenda (optional)</label>
            <textarea rows={2} value={agenda} onChange={(e) => setAgenda(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start time</label>
              <input required type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
              <input type="number" min={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invite students ({invitees.length} selected)</label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
              {students?.map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={invitees.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span className="text-gray-800">{s.full_name}</span>
                  <span className="text-gray-400 text-xs">{s.email}</span>
                </label>
              ))}
              {!students?.length && <p className="px-3 py-3 text-xs text-gray-400">No active students found</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={isPending}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {isPending ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendanceModal({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const { data: rows, isLoading } = useMeetingAttendance(meeting.id);
  const { mutateAsync: sync, isPending: syncing } = useSyncAttendance();
  const toast = useToast();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Attendance — {meeting.topic}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={async () => {
                try {
                  const res: any = await sync(meeting.id);
                  toast.success(res?.data?.detail ?? "Synced from Zoom");
                } catch {
                  toast.error("Sync failed");
                }
              }}
              disabled={syncing}
              className="flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> Sync from Zoom
            </button>
          </div>

          {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

          {!isLoading && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-600 font-medium">Name</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-medium">Attendance</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-medium">Presentation</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows?.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-800">{r.participant_name ?? r.participant_email ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{fmtDur(r.attendance_duration_sec)}</td>
                      <td className="px-3 py-2 text-gray-600">{fmtDur(r.presentation_duration_sec)}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{r.source}</td>
                    </tr>
                  ))}
                  {!rows?.length && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-sm">No attendance recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
