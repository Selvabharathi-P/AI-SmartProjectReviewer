import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function statusBadgeColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    analyzing: "bg-blue-100 text-blue-700",
    reviewed: "bg-purple-100 text-purple-700",
    selected: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    waiting: "bg-yellow-100 text-yellow-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}
