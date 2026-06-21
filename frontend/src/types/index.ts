export type Role = "student" | "faculty" | "admin";

export interface Department {
  id: number;
  name: string;
  code: string | null;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  department_id: number | null;
  department: string | null;
  id_number: string | null;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type ProjectStatus = "pending" | "analyzing" | "reviewed" | "selected" | "rejected" | "waiting";

export interface Project {
  id: number;
  student_id: number;
  department_id: number | null;
  title: string;
  description: string;
  modules: string[];
  technologies: string[];
  team_members: string[];
  domain: string | null;
  status: ProjectStatus;
  submitted_at: string;
  latest_version_id: number;
  version_number: number;
  total_versions: number;
}

export type ReviewStatus = "draft" | "submitted" | "under_review" | "evaluated";

export interface ProjectVersion {
  id: number;
  project_id: number;
  version_number: number;
  description: string;
  modules: string[];
  technologies: string[];
  team_members: string[];
  domain: string | null;
  status: ProjectStatus;
  submitted_at: string;
  submitted_for_review: boolean;
  review_status: ReviewStatus;
  submitted_for_review_at: string | null;
}

export interface ReviewQueueItem {
  project_id: number;
  version_id: number;
  project_name: string;
  version_number: number;
  submitted_by_id: number;
  submitted_by_name: string;
  submission_date: string | null;
  review_status: ReviewStatus;
}

export type MeetingStatus = "upcoming" | "active" | "completed" | "cancelled";

export interface Meeting {
  id: number;
  reviewer_id: number;
  department_id: number | null;
  topic: string;
  agenda: string | null;
  scheduled_start: string;
  duration_minutes: number;
  status: MeetingStatus;
  zoom_meeting_id: string | null;
  join_url: string | null;
  start_url: string | null;
  invitee_count: number;
  created_at: string | null;
}

export interface MeetingAttendance {
  id: number;
  meeting_id: number;
  student_id: number | null;
  participant_name: string | null;
  participant_email: string | null;
  join_time: string | null;
  leave_time: string | null;
  attendance_duration_sec: number;
  presentation_duration_sec: number;
  source: string;
}

export interface StudentLite {
  id: number;
  full_name: string;
  email: string;
  id_number: string | null;
  department_id: number | null;
}

export interface RelatedPaper {
  title: string;
  url: string;
  snippet: string;
}

export interface Evaluation {
  id: number;
  version_id: number;
  title_score: number;
  description_score: number;
  module_score: number;
  tech_score: number;
  innovation_score: number;
  feasibility_score: number;
  ai_total_score: number;
  ai_feedback: string | null;
  suggested_modules: string[];
  missing_skills: string[];
  keywords: string[];
  related_papers: RelatedPaper[];
  similar_projects: RelatedPaper[];
  originality_verdict: string | null;
  faculty_score: number | null;
  faculty_remarks: string | null;
  is_finalized: boolean;
}
