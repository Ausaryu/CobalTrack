import { apiClient } from "../../shared/api/client";
import type {
  AuthToken,
  LoginPayload,
  RegisterPayload,
  User,
} from "../../shared/api/types";

export function login(payload: LoginPayload): Promise<AuthToken> {
  return apiClient.post<AuthToken, LoginPayload>("/api/auth/login", payload);
}

export function register(payload: RegisterPayload): Promise<AuthToken> {
  return apiClient.post<AuthToken, RegisterPayload>("/api/auth/register", payload);
}

export function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/api/auth/me");
}

export function logout(): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>("/api/auth/logout");
}
