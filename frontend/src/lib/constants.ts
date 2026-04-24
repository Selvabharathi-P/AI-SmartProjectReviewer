// ── App identity ──────────────────────────────────────────────
export const APP_NAME = "SmartEval";
export const APP_TAGLINE = "AI-Powered Project Evaluation Platform";
export const APP_DESCRIPTION =
  "Submit, review, and evaluate final-year projects with intelligent feedback and structured scoring.";
export const APP_COPYRIGHT = `© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`;

// ── Routes ────────────────────────────────────────────────────
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  STUDENT_DASHBOARD: "/student/dashboard",
  STUDENT_SUBMIT: "/student/submit",
  FACULTY_DASHBOARD: "/faculty/dashboard",
  FACULTY_SUBMISSIONS: "/faculty/submissions",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_DEPARTMENTS: "/admin/departments",
} as const;

// ── Misc ──────────────────────────────────────────────────────
export const PROJECT_DOMAINS = [
  "web",
  "ml_ai",
  "mobile",
  "iot",
  "cloud",
  "blockchain",
  "General",
] as const;
