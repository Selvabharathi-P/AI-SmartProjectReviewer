"use client";
import { useState } from "react";
import { useAllProjects } from "@/hooks/useProjects";
import { PageLoader } from "@/components/shared/Spinner";
import Link from "next/link";
import { Project } from "@/types";

export default function AdminProjects() {
    const { data: projects, isLoading } = useAllProjects();
    const [filterStatus, setFilterStatus] = useState<string | null>(null);

    const statuses = ["pending", "analyzing", "reviewed", "selected", "rejected", "waiting"];

    const filteredProjects = filterStatus
        ? projects?.filter((p: Project) => p.status === filterStatus)
        : projects;

    const statusConfig: Record<string, { color: string; label: string }> = {
        pending: { color: "bg-gray-50 text-gray-700", label: "Pending" },
        analyzing: { color: "bg-blue-50 text-blue-700", label: "Analyzing" },
        reviewed: { color: "bg-purple-50 text-purple-700", label: "Reviewed" },
        selected: { color: "bg-green-50 text-green-700", label: "Selected" },
        rejected: { color: "bg-red-50 text-red-700", label: "Rejected" },
        waiting: { color: "bg-yellow-50 text-yellow-700", label: "Waiting" },
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">All Projects</h1>
                <p className="text-gray-500 mt-1">Manage and review all student projects</p>
            </div>

            {/* Status Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
                <button
                    onClick={() => setFilterStatus(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === null
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                >
                    All ({projects?.length ?? 0})
                </button>
                {statuses.map((status) => {
                    const count = projects?.filter((p: Project) => p.status === status).length ?? 0;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === status
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                        >
                            {statusConfig[status]?.label || status} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Projects List */}
            {isLoading ? (
                <PageLoader />
            ) : filteredProjects && filteredProjects.length > 0 ? (
                <div className="space-y-4">
                    {filteredProjects.map((project: Project) => (
                        <Link
                            key={project.id}
                            href={`/faculty/review/${project.id}`}
                            className="block bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 text-lg">{project.title}</h3>
                                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                        {project.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                            {project.domain || "Uncategorized"}
                                        </span>
                                        {project.technologies && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {project.technologies.length} technologies
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="ml-4 text-right">
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[project.status || "pending"]?.color
                                            }`}
                                    >
                                        {statusConfig[project.status || "pending"]?.label}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(project.submitted_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No projects found</p>
                </div>
            )}
        </div>
    );
}
