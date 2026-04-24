"use client";
import { useAllProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/shared/Spinner";
import Link from "next/link";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: projects, isLoading } = useAllProjects();

  const stats = {
    total: projects?.length ?? 0,
    analyzing: projects?.filter((p) => p.status === "analyzing").length ?? 0,
    pending: projects?.filter((p) => p.status === "pending").length ?? 0,
    selected: projects?.filter((p) => p.status === "selected").length ?? 0,
    rejected: projects?.filter((p) => p.status === "rejected").length ?? 0,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Projects", value: stats.total, color: "bg-blue-50 text-blue-700" },
          { label: "Analyzing", value: stats.analyzing, color: "bg-purple-50 text-purple-700" },
          { label: "Selected", value: stats.selected, color: "bg-green-50 text-green-700" },
          { label: "Rejected", value: stats.rejected, color: "bg-red-50 text-red-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-5 ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Recent Projects</h2>
          <Link href="/admin/projects" className="text-sm text-blue-600 hover:underline">View All</Link>
        </div>
        {isLoading && <PageLoader />}
        <div className="space-y-3">
          {!isLoading && projects?.slice(0, 8).map((p) => (
            <Link key={p.id} href={`/faculty/review/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">{p.title}</p>
                <p className="text-xs text-gray-400">{new Date(p.submitted_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                p.status === "selected" ? "bg-green-100 text-green-700" :
                p.status === "rejected" ? "bg-red-100 text-red-700" :
                p.status === "analyzing" ? "bg-purple-100 text-purple-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>{p.status}</span>
            </Link>
          ))}
          {!isLoading && !projects?.length && (
            <p className="text-sm text-gray-400 text-center py-4">No projects yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
