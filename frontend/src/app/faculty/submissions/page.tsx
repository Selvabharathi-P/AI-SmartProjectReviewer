"use client";
import { useState } from "react";
import { useAllProjects, useReviewQueue } from "@/hooks/useProjects";
import { statusBadgeColor } from "@/lib/utils";
import Link from "next/link";
import type { ProjectStatus } from "@/types";

const STATUSES: (ProjectStatus | "all")[] = ["all", "analyzing", "reviewed", "selected", "waiting", "rejected"];

const REVIEW_BADGE: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  evaluated: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
};

export default function SubmissionsPage() {
  const { data: projects, isLoading } = useAllProjects();
  const { data: reviewQueue, isLoading: rqLoading } = useReviewQueue();
  const [tab, setTab] = useState<"all" | "queue">("queue");
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = projects?.filter((p) => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Submissions</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("queue")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "queue" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Review queue{reviewQueue ? ` (${reviewQueue.length})` : ""}
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "all" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          All projects
        </button>
      </div>

      {tab === "queue" && (
        <>
          {rqLoading && <p className="text-gray-400 text-sm">Loading…</p>}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Project</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Version</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Submitted by</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Submitted</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Review status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviewQueue?.map((item) => (
                  <tr key={item.version_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.project_name}</td>
                    <td className="px-4 py-3 text-gray-500">v{item.version_number}</td>
                    <td className="px-4 py-3 text-gray-500">{item.submitted_by_name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.submission_date ? new Date(item.submission_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${REVIEW_BADGE[item.review_status] ?? ""}`}>
                        {item.review_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/faculty/review/${item.project_id}`} className="text-blue-600 hover:underline text-xs">
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reviewQueue?.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">No versions submitted for review</div>
            )}
          </div>
        </>
      )}

      {tab === "all" && (
      <>
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
      </>
      )}
    </div>
  );
}
