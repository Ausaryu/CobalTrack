import { apiClient } from "./client";
import type { Exercise, ExerciseFiltersResponse, ExerciseListResponse } from "./types";

export interface SearchExercisesParams {
  q?: string;
  muscle_group?: string;
  equipment?: string;
  limit?: number;
  offset?: number;
}

export function searchExercises(params: SearchExercisesParams = {}): Promise<ExerciseListResponse> {
  const p = new URLSearchParams({ limit: String(params.limit ?? 50) });
  if (params.offset) p.set("offset", String(params.offset));
  if (params.q) p.set("q", params.q);
  if (params.muscle_group) p.set("muscle_group", params.muscle_group);
  if (params.equipment) p.set("equipment", params.equipment);
  return apiClient.get<ExerciseListResponse>(`/api/exercises/search?${p.toString()}`);
}

export function getExerciseFilters(): Promise<ExerciseFiltersResponse> {
  return apiClient.get<ExerciseFiltersResponse>("/api/exercises/filters");
}

export function getExerciseById(id: number): Promise<Exercise> {
  return apiClient.get<Exercise>(`/api/exercises/${id}`);
}

export function listExercisesLegacy(): Promise<Exercise[]> {
  return apiClient.get<Exercise[]>("/api/exercises");
}
