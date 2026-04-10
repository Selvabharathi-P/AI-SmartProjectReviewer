import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (item: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 4000;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (item) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { ...item, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience hook — call toast.success() / toast.error() / toast.info() */
export function useToast() {
  const { add } = useToastStore();
  return {
    success: (title: string, description?: string) =>
      add({ title, description, type: "success" }),
    error: (title: string, description?: string) =>
      add({ title, description, type: "error" }),
    info: (title: string, description?: string) =>
      add({ title, description, type: "info" }),
  };
}
