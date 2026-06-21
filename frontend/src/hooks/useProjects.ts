import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Project, ProjectVersion, ReviewQueueItem, Evaluation } from "@/types";

export interface VersionPayload {
  description: string;
  modules: string[];
  technologies: string[];
  team_members: string[];
  domain?: string;
}

export function useMyProjects() {
  return useQuery<Project[]>({
    queryKey: ["my-projects"],
    queryFn: async () => (await api.get("/projects/my")).data,
  });
}

export function useAllProjects() {
  return useQuery<Project[]>({
    queryKey: ["all-projects"],
    queryFn: async () => (await api.get("/projects")).data,
  });
}

export function useProject(id: number) {
  return useQuery<Project>({
    queryKey: ["project", id],
    queryFn: async () => (await api.get(`/projects/${id}`)).data,
    enabled: !!id,
  });
}

export function useEvaluation(projectId: number, projectStatus?: string) {
  const isAnalyzing = projectStatus === "analyzing";
  return useQuery<Evaluation>({
    queryKey: ["evaluation", projectId],
    queryFn: async () => (await api.get(`/evaluations/${projectId}`)).data,
    enabled: !!projectId,
    retry: 5,
    retryDelay: 3000,
    // Poll every 4 seconds while project is still being analyzed
    refetchInterval: isAnalyzing ? 4000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useProjectVersions(projectId: number) {
  return useQuery<ProjectVersion[]>({
    queryKey: ["project-versions", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}/versions`)).data,
    enabled: !!projectId,
  });
}

export function useUploadVersion(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VersionPayload) => api.post(`/projects/${projectId}/versions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-versions", projectId] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

export function useSubmitVersionForReview(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: number) =>
      api.post(`/projects/${projectId}/versions/${versionId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-versions", projectId] });
      qc.invalidateQueries({ queryKey: ["review-queue"] });
    },
  });
}

export function useReviewQueue() {
  return useQuery<ReviewQueueItem[]>({
    queryKey: ["review-queue"],
    queryFn: async () => (await api.get("/projects/review-queue")).data,
  });
}

export function useVersionEvaluation(versionId: number | undefined, versionStatus?: string) {
  const isAnalyzing = versionStatus === "analyzing";
  return useQuery<Evaluation>({
    queryKey: ["version-evaluation", versionId],
    queryFn: async () => (await api.get(`/evaluations/version/${versionId}`)).data,
    enabled: !!versionId,
    retry: 5,
    retryDelay: 3000,
    refetchInterval: isAnalyzing ? 4000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useParseDocument() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/projects/parse-document", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data as {
        title: string;
        description: string;
        modules: string[];
        technologies: string[];
        team_members: string[];
        domain: string;
      };
    },
  });
}

export function useSubmitProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      modules: string[];
      technologies: string[];
      team_members: string[];
      domain?: string;
    }) => api.post("/projects", data),
    // refetchType "all" also refetches the (currently unmounted) dashboard query,
    // so the new project is already in cache when we navigate there.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-projects"], refetchType: "all" }),
  });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/projects/${id}/status`, { status }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["all-projects"] });
      qc.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}

export function useFacultyReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: {
        faculty_score: number;
        faculty_remarks?: string;
        is_finalized?: boolean;
        project_status?: string;
      };
    }) => api.patch(`/evaluations/${projectId}/faculty-review`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["evaluation", projectId] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["all-projects"] });
    },
  });
}
