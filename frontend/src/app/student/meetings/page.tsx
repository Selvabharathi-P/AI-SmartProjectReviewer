"use client";
import { useStudentMeetings, useJoinMeeting } from "@/hooks/useMeetings";
import { useToast } from "@/hooks/useToast";
import { PageLoader } from "@/components/shared/Spinner";
import { Video, Calendar, Clock, Radio } from "lucide-react";
import type { Meeting, MeetingStatus } from "@/types";

const SECTIONS: { key: MeetingStatus; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

export default function StudentMeetingsPage() {
  const { data: meetings, isLoading } = useStudentMeetings();
  const { mutateAsync: join } = useJoinMeeting();
  const toast = useToast();

  const handleJoin = async (m: Meeting) => {
    if (!m.join_url) {
      toast.error("No meeting link available yet");
      return;
    }
    try {
      await join(m.id);
    } catch {
      /* attendance is best-effort; still let them join */
    }
    window.open(m.join_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Review Meetings</h1>
        <p className="text-gray-500 mt-1">Join your scheduled project review meetings</p>
      </div>

      {isLoading && <PageLoader />}

      {!isLoading && meetings?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Video size={40} className="mx-auto mb-3 opacity-40" />
          <p>No meetings scheduled yet.</p>
        </div>
      )}

      {!isLoading &&
        SECTIONS.map(({ key, label }) => {
          const items = meetings?.filter((m) => m.status === key) ?? [];
          if (!items.length) return null;
          return (
            <div key={key} className="mb-8">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {key === "active" && <Radio size={14} className="text-green-500" />}
                {label} ({items.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((m) => (
                  <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-800 text-sm pr-3">{m.topic}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                          m.status === "active"
                            ? "bg-green-100 text-green-700"
                            : m.status === "upcoming"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    {m.agenda && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{m.agenda}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(m.scheduled_start).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {m.duration_minutes} min
                      </span>
                    </div>
                    {m.status === "active" && (
                      <button
                        onClick={() => handleJoin(m)}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Video size={15} /> Join meeting
                      </button>
                    )}
                    {m.status === "upcoming" && (
                      <button
                        disabled
                        className="w-full text-sm font-medium py-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
                      >
                        Not started yet
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
