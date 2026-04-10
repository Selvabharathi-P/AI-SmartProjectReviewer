"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useProject, useEvaluation, useFacultyReview } from "@/hooks/useProjects";
import ScoreChart from "@/components/shared/ScoreChart";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { scoreColor, statusBadgeColor } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, ExternalLink, Globe, AlertTriangle, Lightbulb } from "lucide-react";
import type { ProjectStatus } from "@/types";

type Decision = "selected" | "waiting" | "rejected" | null;

const DECISION_CONFIG: Record<
  Exclude<Decision, null>,
  { label: string; icon: React.ReactNode; active: string; inactive: string }
> = {
  selected: {
    label: "Select",
    icon: <CheckCircle2 size={18} />,
    active: "bg-green-600 text-white border-green-600",
    inactive: "border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50",
  },
  waiting: {
    label: "Waitlist",
    icon: <Clock size={18} />,
    active: "bg-yellow-500 text-white border-yellow-500",
    inactive: "border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-yellow-700 hover:bg-yellow-50",
  },
  rejected: {
    label: "Reject",
    icon: <XCircle size={18} />,
    active: "bg-red-600 text-white border-red-600",
    inactive: "border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50",
  },
};

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id);
  const { data: project, isLoading: pLoading } = useProject(projectId);
  const { data: evaluation, isLoading: eLoading } = useEvaluation(projectId, project?.status);
  const { mutateAsync: facultyReview, isPending: reviewPending } = useFacultyReview();

  const [decision, setDecision] = useState<Decision>(null);
  const [facultyScore, setFacultyScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saved, setSaved] = useState(false);

  if (pLoading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (!project) return <div className="text-red-500">Project not found</div>;

  // Derive current decision from project status
  const currentStatus = project.status as ProjectStatus;
  const activeDecision: Decision =
    currentStatus === "selected" || currentStatus === "waiting" || currentStatus === "rejected"
      ? currentStatus
      : null;

  const handleSave = async () => {
    if (!facultyScore) return;
    await facultyReview({
      projectId,
      data: {
        faculty_score: parseFloat(facultyScore),
        faculty_remarks: remarks || undefined,
        is_finalized: true,
        project_status: decision ?? undefined,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{project.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {project.domain ?? "General"} · Submitted {new Date(project.submitted_at).toLocaleDateString()}
          </p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusBadgeColor(project.status)}`}>
          {project.status}
        </span>
      </div>

      {/* Project Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Project Details</h2>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{project.description}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Modules</p>
            <ul className="space-y-1">
              {project.modules.map((m) => (
                <li key={m} className="text-sm text-gray-700">• {m}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Technologies</p>
            <div className="flex flex-wrap gap-1">
              {project.technologies.map((t) => (
                <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Evaluation */}
      {eLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-blue-700 font-medium text-sm">AI is evaluating this project…</p>
        </div>
      )}

      {evaluation && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">AI Evaluation</h2>
              <span className={`text-2xl font-bold ${scoreColor(evaluation.ai_total_score)}`}>
                {evaluation.ai_total_score.toFixed(1)}/100
              </span>
            </div>
            <ScoreChart evaluation={evaluation} />

            {evaluation.ai_feedback && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <MarkdownRenderer content={evaluation.ai_feedback} />
              </div>
            )}

            {evaluation.missing_skills.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Missing Skills</p>
                <div className="flex flex-wrap gap-1">
                  {evaluation.missing_skills.map((s) => (
                    <span key={s} className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {evaluation.suggested_modules.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Lightbulb size={12} /> Suggested Additions
                </p>
                <ul className="space-y-1">
                  {evaluation.suggested_modules.map((m, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-yellow-500">+</span> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Originality & Related Work */}
          {(evaluation.originality_verdict || evaluation.related_papers.length > 0 || evaluation.similar_projects.length > 0) && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Globe size={18} className="text-blue-500" /> Web Research & Originality
              </h2>

              {evaluation.originality_verdict && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-relaxed">{evaluation.originality_verdict}</p>
                </div>
              )}

              {evaluation.related_papers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Related Research Papers</p>
                  <ul className="space-y-2">
                    {evaluation.related_papers.map((p, i) => (
                      <li key={i} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {p.title} <ExternalLink size={12} />
                        </a>
                        {p.snippet && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.snippet}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.similar_projects.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Similar Published Projects</p>
                  <ul className="space-y-2">
                    {evaluation.similar_projects.map((p, i) => (
                      <li key={i} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {p.title} <ExternalLink size={12} />
                        </a>
                        {p.snippet && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.snippet}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Faculty Decision Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Faculty Decision</h2>
            <p className="text-xs text-gray-400 mb-5">Select a verdict, optionally override the score, then save.</p>

            {/* Decision Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {(Object.entries(DECISION_CONFIG) as [Exclude<Decision, null>, typeof DECISION_CONFIG[keyof typeof DECISION_CONFIG]][]).map(
                ([key, cfg]) => {
                  const isActive = (decision ?? activeDecision) === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setDecision(key)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        isActive ? cfg.active : cfg.inactive
                      }`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </button>
                  );
                }
              )}
            </div>

            {/* Score & Remarks */}
            <div className="space-y-4">
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Override Score <span className="text-gray-400">(0–100)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={facultyScore}
                      onChange={(e) => setFacultyScore(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder={evaluation.faculty_score?.toFixed(0) ?? evaluation.ai_total_score.toFixed(0)}
                    />
                    <span className="text-xs text-gray-400">
                      AI: {evaluation.ai_total_score.toFixed(1)}
                      {evaluation.faculty_score != null && ` · Last: ${evaluation.faculty_score.toFixed(1)}`}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks for student</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={evaluation.faculty_remarks ?? "Add feedback for the student…"}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={reviewPending || !facultyScore}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
                >
                  {reviewPending ? "Saving…" : "Save Decision"}
                </button>
                {saved && (
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    <CheckCircle2 size={15} /> Saved successfully
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
