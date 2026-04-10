import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only force logout if the 401 comes from an auth endpoint or carries an
    // "expired" / "credentials" detail — not from a resource-level permission error.
    if (err.response?.status === 401 && typeof window !== "undefined") {
      const detail: string = err.response.data?.detail ?? "";
      const isAuthEndpoint = err.config?.url?.includes("/auth/");
      const isExpired =
        detail.toLowerCase().includes("expired") ||
        detail.toLowerCase().includes("invalid") ||
        detail.toLowerCase().includes("credentials") ||
        !detail; // no detail = generic token failure
      if (!isAuthEndpoint && isExpired) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
