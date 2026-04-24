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
}

export interface RelatedPaper {
  title: string;
  url: string;
  snippet: string;
}

export interface Evaluation {
  id: number;
  project_id: number;
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
