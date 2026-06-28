import { apiClient } from "./client";
import type { WorkoutCreate, WorkoutListResponse, WorkoutSession, WorkoutUpdate } from "./types";

export interface SearchWorkoutsParams {
  q?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export function searchWorkouts(params: SearchWorkoutsParams = {}): Promise<WorkoutListResponse> {
  const p = new URLSearchParams({ limit: String(params.limit ?? 20) });
  if (params.offset) p.set("offset", String(params.offset));
  if (params.q) p.set("q", params.q);
  if (params.date_from) p.set("date_from", params.date_from);
  if (params.date_to) p.set("date_to", params.date_to);
  return apiClient.get<WorkoutListResponse>(`/api/workouts/search?${p.toString()}`);
}

export function listWorkoutsLegacy(): Promise<WorkoutSession[]> {
  return apiClient.get<WorkoutSession[]>("/api/workouts");
}

export function createWorkout(payload: WorkoutCreate): Promise<WorkoutSession> {
  return apiClient.post<WorkoutSession, WorkoutCreate>("/api/workouts", payload);
}

export function updateWorkout(id: number, payload: WorkoutUpdate): Promise<WorkoutSession> {
  return apiClient.put<WorkoutSession, WorkoutUpdate>(`/api/workouts/${id}`, payload);
}

export function deleteWorkout(id: number): Promise<void> {
  return apiClient.del(`/api/workouts/${id}`);
}
