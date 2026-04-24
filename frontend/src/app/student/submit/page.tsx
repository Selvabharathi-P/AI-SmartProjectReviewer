"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSubmitProject, useParseDocument } from "@/hooks/useProjects";
import { useToast } from "@/hooks/useToast";
import Spinner from "@/components/shared/Spinner";
import { X, Plus, Upload, FileText, AlertCircle } from "lucide-react";
import { ROUTES, PROJECT_DOMAINS } from "@/lib/constants";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  domain: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const ACCEPTED_TYPES = ".pptx,.ppt,.pdf,.docx,.doc";
const ACCEPTED_LABELS = "PPT, PPTX, PDF, DOCX, DOC";

export default function SubmitProject() {
  const router = useRouter();
  const { mutateAsync, isPending } = useSubmitProject();
  const { mutateAsync: parseDoc, isPending: isParsing } = useParseDocument();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modules, setModules] = useState<string[]>([""]);
  const [technologies, setTechnologies] = useState<string[]>([""]);
  const [teamMembers, setTeamMembers] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const updateList = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) => {
    setter((prev) => prev.map((v, i) => (i === idx ? val : v)));
  };
  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((p) => [...p, ""]);
  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) =>
    setter((p) => p.filter((_, i) => i !== idx));

  const handleFile = async (file: File) => {
    setParseError("");
    setUploadedFile(file.name);
    try {
      const data = await parseDoc(file);
      setValue("title", data.title);
      setValue("description", data.description);
      if (data.domain) setValue("domain", data.domain);
      setModules(data.modules.length ? data.modules : [""]);
      setTechnologies(data.technologies.length ? data.technologies : [""]);
      setTeamMembers(data.team_members.length ? data.team_members : [""]);
      toast.success("Document parsed!", "Fields auto-filled. Review and submit.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Could not parse document. Fill manually.";
      setParseError(msg);
      setUploadedFile(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onSubmit = async (data: FormData) => {
    const cleanModules = modules.filter((m) => m.trim());
    const cleanTech = technologies.filter((t) => t.trim());
    if (cleanModules.length < 2) { setError("Add at least 2 modules"); return; }
    if (cleanTech.length < 1) { setError("Add at least 1 technology"); return; }
    try {
      setError("");
      await mutateAsync({ ...data, modules: cleanModules, technologies: cleanTech, team_members: teamMembers.filter(Boolean) });
      toast.success("Project submitted!", "Our AI is now analyzing your project.");
      router.push(ROUTES.STUDENT_DASHBOARD);
    } catch {
      setError("Submission failed. Please try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Submit Project</h1>
      <p className="text-gray-500 mb-6">Upload a document to auto-fill, or fill manually below</p>

      {/* Document upload */}
      <div
        className={`mb-8 border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={onFileChange}
        />
        {isParsing ? (
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <Spinner size="sm" />
            <p className="text-sm font-medium">Parsing document with AI…</p>
          </div>
        ) : uploadedFile ? (
          <div className="flex flex-col items-center gap-1 text-green-600">
            <FileText size={28} />
            <p className="text-sm font-medium">{uploadedFile}</p>
            <p className="text-xs text-gray-500">Fields auto-filled. Click to replace.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload size={28} />
            <p className="text-sm font-medium text-gray-600">Drop your project document here</p>
            <p className="text-xs">{ACCEPTED_LABELS} · Max 20 MB</p>
          </div>
        )}
      </div>

      {parseError && (
        <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
          <input {...register("title")} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. AI-Based Student Performance Predictor" />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea {...register("description")} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Describe your project in detail (min 50 characters)..." />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
          <select {...register("domain")} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PROJECT_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Modules */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Modules *</label>
          <div className="space-y-2">
            {modules.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input value={m} onChange={(e) => updateList(setModules, i, e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Module ${i + 1}`} />
                {modules.length > 1 && <button type="button" onClick={() => removeItem(setModules, i)} className="text-red-400 hover:text-red-600"><X size={16} /></button>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addItem(setModules)} className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"><Plus size={14} /> Add Module</button>
        </div>

        {/* Technologies */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Technologies *</label>
          <div className="space-y-2">
            {technologies.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input value={t} onChange={(e) => updateList(setTechnologies, i, e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Technology ${i + 1}`} />
                {technologies.length > 1 && <button type="button" onClick={() => removeItem(setTechnologies, i)} className="text-red-400 hover:text-red-600"><X size={16} /></button>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addItem(setTechnologies)} className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"><Plus size={14} /> Add Technology</button>
        </div>

        {/* Team Members */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Team Members</label>
          <div className="space-y-2">
            {teamMembers.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input value={m} onChange={(e) => updateList(setTeamMembers, i, e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Member name" />
                {teamMembers.length > 1 && <button type="button" onClick={() => removeItem(setTeamMembers, i)} className="text-red-400 hover:text-red-600"><X size={16} /></button>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addItem(setTeamMembers)} className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"><Plus size={14} /> Add Member</button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isPending || isParsing}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {isPending ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              Submitting &amp; Analyzing…
            </>
          ) : (
            "Submit Project for AI Review"
          )}
        </button>
      </form>
    </div>
  );
}
