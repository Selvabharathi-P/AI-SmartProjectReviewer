"use client";
import { useMyProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import ProjectCard from "@/components/shared/ProjectCard";
import { PageLoader } from "@/components/shared/Spinner";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { ROUTES } from "@/lib/constants";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: projects, isLoading } = useMyProjects();

  const stats = {
    total: projects?.length ?? 0,
    selected: projects?.filter((p) => p.status === "selected").length ?? 0,
    reviewed: projects?.filter((p) => p.status === "reviewed").length ?? 0,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.full_name}</h1>
        <p className="text-gray-500 mt-1">Manage and track your project submissions</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Submitted", value: stats.total, color: "bg-blue-50 text-blue-700" },
          { label: "Under Review", value: stats.reviewed, color: "bg-purple-50 text-purple-700" },
          { label: "Selected", value: stats.selected, color: "bg-green-50 text-green-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-5 ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">My Projects</h2>
        <Link href={ROUTES.STUDENT_SUBMIT} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <FolderPlus size={16} /> Submit New
        </Link>
      </div>

      {isLoading && <PageLoader />}
      {!isLoading && projects?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FolderPlus size={40} className="mx-auto mb-3 opacity-40" />
          <p>No projects yet. Submit your first project!</p>
        </div>
      )}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects?.map((p) => (
            <ProjectCard key={p.id} project={p} href={`/student/feedback/${p.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
