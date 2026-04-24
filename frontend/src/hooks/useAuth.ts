import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import type { AuthResponse } from "@/types";

export function useAuth() {
  const { user, token, setAuth, logout } = useAuthStore();

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    setAuth(data.user, data.access_token);
    return data.user;
  };

  const register = async (payload: {
    full_name: string;
    email: string;
    password: string;
    role: string;
    department_id?: number | null;
    id_number?: string | null;
  }) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  };

  return { user, token, login, register, logout, isAuthenticated: !!token };
}
