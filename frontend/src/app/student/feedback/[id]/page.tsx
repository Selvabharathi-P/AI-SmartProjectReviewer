"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject, useProjectVersions, useVersionEvaluation, useUploadVersion, useSubmitVersionForReview } from "@/hooks/useProjects";
import { useToast } from "@/hooks/useToast";
import ScoreChart from "@/components/shared/ScoreChart";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { scoreColor, statusBadgeColor } from "@/lib/utils";
import { CheckCircle, AlertCircle, Lightbulb, Tag, Globe, ExternalLink, AlertTriangle, History, Upload } from "lucide-react";

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id);
  const { data: project, isLoading: pLoading } = useProject(projectId);
  const { data: versions } = useProjectVersions(projectId);
  const { mutateAsync: uploadVersion, isPending: uploading } = useUploadVersion(projectId);
  const { mutateAsync: submitForReview, isPending: submitting } = useSubmitVersionForReview(projectId);
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [showUpload, setShowUpload] = useState(false);

  // Default selection follows the latest version.
  useEffect(() => {
    if (project?.latest_version_id) setSelectedId(project.latest_version_id);
  }, [project?.latest_version_id]);

  const selected = versions?.find((v) => v.id === selectedId);
  const { data: evaluation, isLoading: eLoading } = useVersionEvaluation(selectedId, selected?.status);

  if (pLoading) return <div className="text-gray-400 text-sm">Loading project…</div>;
  if (!project) return <div className="text-red-500">Project not found</div>;

  const display = selected ?? project;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{project.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{display.domain} · {new Date(display.submitted_at).toLocaleDateString()}</p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusBadgeColor(display.status)}`}>
            {display.status}
          </span>
        </div>
      </div>

      {/* Version history */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <History size={16} className="text-blue-500" /> Version history
          </h2>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload size={13} /> Upload new version
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {versions?.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                v.id === selectedId
                  ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              v{v.version_number}
              {v.id === project.latest_version_id && " (latest)"}
              <span className="text-gray-400 ml-1">· {new Date(v.submitted_at).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Review submission for the selected version */}
      {selected && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-500">Review status of v{selected.version_number}: </span>
            <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${reviewBadge(selected.review_status)}`}>
              {selected.review_status.replace("_", " ")}
            </span>
            {selected.submitted_for_review_at && (
              <span className="text-gray-400 ml-2 text-xs">
                submitted {new Date(selected.submitted_for_review_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {!selected.submitted_for_review && (
            <button
              onClick={async () => {
                try {
                  await submitForReview(selected.id);
                  toast.success(`v${selected.version_number} submitted for review`);
                } catch {
                  toast.error("Failed to submit for review");
                }
              }}
              disabled={submitting}
              className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Submit this version for review
            </button>
          )}
        </div>
      )}

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

      {showUpload && (
        <UploadVersionModal
          uploading={uploading}
          onClose={() => setShowUpload(false)}
          onSubmit={async (data) => {
            try {
              await uploadVersion(data);
              toast.success("New version uploaded — AI is analyzing it");
              setShowUpload(false);
            } catch {
              toast.error("Failed to upload version");
            }
          }}
        />
      )}
    </div>
  );
}

interface UploadModalProps {
  uploading: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    modules: string[];
    technologies: string[];
    team_members: string[];
    domain?: string;
  }) => void;
}

function splitList(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function reviewBadge(status: string): string {
  switch (status) {
    case "submitted":
      return "bg-blue-100 text-blue-700";
    case "under_review":
      return "bg-amber-100 text-amber-700";
    case "evaluated":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function UploadVersionModal({ uploading, onClose, onSubmit }: UploadModalProps) {
  const [description, setDescription] = useState("");
  const [modules, setModules] = useState("");
  const [technologies, setTechnologies] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [domain, setDomain] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              description,
              modules: splitList(modules),
              technologies: splitList(technologies),
              team_members: splitList(teamMembers),
              domain: domain || undefined,
            });
          }}
          className="p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-gray-800">Upload new version</h2>
          <p className="text-xs text-gray-500 -mt-2">
            This adds a new version to the same project and re-runs the AI evaluation.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Modules (comma separated)</label>
            <input
              required
              value={modules}
              onChange={(e) => setModules(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Technologies (comma separated)</label>
            <input
              required
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Team members (comma separated)</label>
            <input
              value={teamMembers}
              onChange={(e) => setTeamMembers(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Domain</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload version"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
