import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Project, Evaluation } from "@/types";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-projects"] }),
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
