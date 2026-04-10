"use client";
import { useAllProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/shared/Spinner";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { data: projects, isLoading } = useAllProjects();

  const stats = {
    total: projects?.length ?? 0,
    pending: projects?.filter((p) => ["pending", "analyzing"].includes(p.status)).length ?? 0,
    finalized: projects?.filter((p) => ["selected", "rejected"].includes(p.status)).length ?? 0,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Faculty Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Submissions", value: stats.total, color: "bg-blue-50 text-blue-700" },
          { label: "Pending Review", value: stats.pending, color: "bg-yellow-50 text-yellow-700" },
          { label: "Finalized", value: stats.finalized, color: "bg-green-50 text-green-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-5 ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Recent Submissions</h2>
          <Link href={ROUTES.FACULTY_SUBMISSIONS} className="text-sm text-blue-600 hover:underline">View All</Link>
        </div>
        {isLoading && <PageLoader />}
        <div className="space-y-3">
          {!isLoading && projects?.slice(0, 5).map((p) => (
            <Link key={p.id} href={`/faculty/review/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">{p.title}</p>
                <p className="text-xs text-gray-400">{new Date(p.submitted_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                p.status === "selected" ? "bg-green-100 text-green-700" :
                p.status === "rejected" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>{p.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
