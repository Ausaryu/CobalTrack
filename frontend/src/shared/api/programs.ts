import { apiClient } from "./client";
import type { Program, ProgramCreate, ProgramListResponse, ProgramUpdate } from "./types";

export interface SearchProgramsParams {
  q?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export function searchPrograms(params: SearchProgramsParams = {}): Promise<ProgramListResponse> {
  const p = new URLSearchParams({ limit: String(params.limit ?? 20) });
  if (params.offset) p.set("offset", String(params.offset));
  if (params.q) p.set("q", params.q);
  if (params.is_active !== undefined) p.set("is_active", String(params.is_active));
  return apiClient.get<ProgramListResponse>(`/api/programs/search?${p.toString()}`);
}

export function listProgramsLegacy(): Promise<Program[]> {
  return apiClient.get<Program[]>("/api/programs");
}

export function createProgram(payload: ProgramCreate): Promise<Program> {
  return apiClient.post<Program, ProgramCreate>("/api/programs", payload);
}

export function updateProgram(id: number, payload: ProgramUpdate): Promise<Program> {
  return apiClient.put<Program, ProgramUpdate>(`/api/programs/${id}`, payload);
}

export function deleteProgram(id: number): Promise<void> {
  return apiClient.del(`/api/programs/${id}`);
}
