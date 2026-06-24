import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Meeting, MeetingAttendance, MeetingStatus, StudentLite } from "@/types";

export interface CreateMeetingData {
  topic: string;
  agenda?: string;
  scheduled_start: string; // ISO
  duration_minutes: number;
  department_id?: number | null;
  invitee_ids: number[];
}

export function useReviewerMeetings() {
  return useQuery<Meeting[]>({
    queryKey: ["reviewer-meetings"],
    queryFn: async () => (await api.get("/meetings")).data,
  });
}

export function useStudentMeetings() {
  return useQuery<Meeting[]>({
    queryKey: ["student-meetings"],
    queryFn: async () => (await api.get("/meetings/my")).data,
  });
}

export function useInvitableStudents(departmentId?: number | null) {
  return useQuery<StudentLite[]>({
    queryKey: ["invitable-students", departmentId ?? "all"],
    queryFn: async () =>
      (await api.get("/meetings/students", {
        params: departmentId != null ? { department_id: departmentId } : {},
      })).data,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMeetingData) => api.post("/meetings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviewer-meetings"] }),
  });
}

export function useUpdateMeetingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: MeetingStatus }) =>
      api.patch(`/meetings/${id}/status`, null, { params: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviewer-meetings"] }),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/meetings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviewer-meetings"] }),
  });
}

export function useHostJoin() {
  return useMutation({
    mutationFn: (id: number) => api.post(`/meetings/${id}/host-join`),
  });
}

export function useMeetingAttendance(meetingId: number | undefined) {
  return useQuery<MeetingAttendance[]>({
    queryKey: ["meeting-attendance", meetingId],
    queryFn: async () => (await api.get(`/meetings/${meetingId}/attendance`)).data,
    enabled: !!meetingId,
  });
}

export function useSyncAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/meetings/${id}/sync`),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ["meeting-attendance", id] }),
  });
}

export function useJoinMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/meetings/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-meetings"] }),
  });
}

export function useLeaveMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/meetings/${id}/leave`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-meetings"] }),
  });
}

export async function downloadAttendanceReport(meetingId: number, format: "xlsx" | "pdf") {
  const res = await api.get(`/meetings/${meetingId}/report`, {
    params: { format },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance_meeting_${meetingId}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
