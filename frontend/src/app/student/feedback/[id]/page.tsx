"use client";
import { useParams } from "next/navigation";
import { useProject, useEvaluation } from "@/hooks/useProjects";
import ScoreChart from "@/components/shared/ScoreChart";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { scoreColor, statusBadgeColor } from "@/lib/utils";
import { CheckCircle, AlertCircle, Lightbulb, Tag, Globe, ExternalLink, AlertTriangle } from "lucide-react";

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id);
  const { data: project, isLoading: pLoading } = useProject(projectId);
  const { data: evaluation, isLoading: eLoading } = useEvaluation(projectId, project?.status);

  if (pLoading) return <div className="text-gray-400 text-sm">Loading project…</div>;
  if (!project) return <div className="text-red-500">Project not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{project.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{project.domain} · {new Date(project.submitted_at).toLocaleDateString()}</p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusBadgeColor(project.status)}`}>
            {project.status}
          </span>
        </div>
      </div>

      {eLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-blue-700 font-medium">AI is analyzing your project…</p>
          <p className="text-blue-500 text-sm mt-1">This may take a moment. We'll update automatically.</p>
        </div>
      )}

      {evaluation && (
        <div className="space-y-6">
          {/* Total Score */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500 mb-1">AI Total Score</p>
            <p className={`text-5xl font-bold ${scoreColor(evaluation.ai_total_score)}`}>
              {evaluation.ai_total_score.toFixed(1)}
            </p>
            <p className="text-gray-400 text-sm mt-1">out of 100</p>
            {evaluation.is_finalized && evaluation.faculty_score !== null && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Faculty Final Score</p>
                <p className={`text-3xl font-bold ${scoreColor(evaluation.faculty_score)}`}>
                  {evaluation.faculty_score.toFixed(1)}
                </p>
              </div>
            )}
          </div>

          {/* Radar Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Score Breakdown</h2>
            <ScoreChart evaluation={evaluation} />
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: "Title", val: evaluation.title_score },
                { label: "Description", val: evaluation.description_score },
                { label: "Modules", val: evaluation.module_score },
                { label: "Technology", val: evaluation.tech_score },
                { label: "Innovation", val: evaluation.innovation_score },
                { label: "Feasibility", val: evaluation.feasibility_score },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className={`text-lg font-bold ${scoreColor(val)}`}>{val.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Feedback — rendered as proper markdown */}
          {evaluation.ai_feedback && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" /> AI Feedback
              </h2>
              <MarkdownRenderer content={evaluation.ai_feedback} />
            </div>
          )}

          {/* Originality Verdict */}
          {evaluation.originality_verdict && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h2 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" /> Originality Check
              </h2>
              <p className="text-sm text-amber-800 leading-relaxed">{evaluation.originality_verdict}</p>
            </div>
          )}

          {/* Related Research Papers */}
          {evaluation.related_papers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Globe size={18} className="text-blue-500" /> Related Research Papers
              </h2>
              <ul className="space-y-3">
                {evaluation.related_papers.map((p, i) => (
                  <li key={i} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {p.title} <ExternalLink size={12} />
                    </a>
                    {p.snippet && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.snippet}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Similar Published Projects */}
          {evaluation.similar_projects.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Globe size={18} className="text-purple-500" /> Similar Published Projects
              </h2>
              <ul className="space-y-3">
                {evaluation.similar_projects.map((p, i) => (
                  <li key={i} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {p.title} <ExternalLink size={12} />
                    </a>
                    {p.snippet && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.snippet}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Modules */}
          {evaluation.suggested_modules.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Lightbulb size={18} className="text-yellow-500" /> Suggested Additions
              </h2>
              <ul className="space-y-2">
                {evaluation.suggested_modules.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-yellow-500 mt-0.5">+</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Skills */}
          {evaluation.missing_skills.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" /> Missing Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {evaluation.missing_skills.map((s) => (
                  <span key={s} className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {evaluation.keywords.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Tag size={18} className="text-blue-500" /> Detected Keywords
              </h2>
              <div className="flex flex-wrap gap-2">
                {evaluation.keywords.slice(0, 20).map((k) => (
                  <span key={k} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* Faculty Remarks */}
          {evaluation.faculty_remarks && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h2 className="font-semibold text-purple-800 mb-2">Faculty Remarks</h2>
              <p className="text-purple-700 text-sm">{evaluation.faculty_remarks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
