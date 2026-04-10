"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    } else if (user?.role === "student") {
      router.replace("/student/dashboard");
    } else if (user?.role === "faculty") {
      router.replace("/faculty/dashboard");
    } else {
      router.replace("/login");
    }
  }, [token, user, router]);

  return null;
}
