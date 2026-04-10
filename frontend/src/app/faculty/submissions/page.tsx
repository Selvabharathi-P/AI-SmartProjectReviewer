"use client";
import { useState } from "react";
import { useAllProjects } from "@/hooks/useProjects";
import { statusBadgeColor } from "@/lib/utils";
import Link from "next/link";
import type { ProjectStatus } from "@/types";

const STATUSES: (ProjectStatus | "all")[] = ["all", "analyzing", "reviewed", "selected", "waiting", "rejected"];

export default function SubmissionsPage() {
  const { data: projects, isLoading } = useAllProjects();
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = projects?.filter((p) => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">All Submissions</h1>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Title</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Domain</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Submitted</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{p.title}</td>
                <td className="px-4 py-3 text-gray-500">{p.domain ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeColor(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.submitted_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/faculty/review/${p.id}`} className="text-blue-600 hover:underline text-xs">
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered?.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No submissions found</div>
        )}
      </div>
    </div>
  );
}
