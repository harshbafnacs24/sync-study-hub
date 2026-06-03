import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksStore, type Task, type TaskPriority } from "../store/tasks";
import { sessionsStore, computeAnalytics } from "../store/sessions";
import { api } from "../api-client";

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: async () => tasksStore.list(), staleTime: 0 });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; priority: TaskPriority; dueDate?: string | null; subject?: string | null; notes?: string }) =>
      tasksStore.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => tasksStore.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => tasksStore.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => tasksStore.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useAnalytics() {
  return useQuery({ queryKey: ["analytics"], queryFn: async () => computeAnalytics(), staleTime: 30_000 });
}

export function useActiveSession() {
  return useQuery({ queryKey: ["session", "active"], queryFn: async () => sessionsStore.active(), staleTime: 0 });
}

export function useProfile() {
  return useQuery({ queryKey: ["my-profile"], queryFn: () => api.getMyProfile(), staleTime: 30000 });
}
