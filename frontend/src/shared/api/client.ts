import { API_BASE_URL } from "../config/env";

export const AUTH_TOKEN_STORAGE_KEY = "cobaltrack.authToken";
export const AUTH_UNAUTHORIZED_EVENT = "cobaltrack:unauthorized";

type ErrorDetail = string | Array<{ msg?: string }> | undefined;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getErrorMessage(detail: ErrorDetail, status: number): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => item.msg)
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      return messages.join(" · ");
    }
  }

  return `La requête a échoué (${status}).`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? (payload as { detail?: ErrorDetail }).detail
        : undefined;
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, getErrorMessage(detail, response.status), detail);
  }

  return payload as T;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T, TBody = unknown>(path: string, body?: TBody): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  put<T, TBody = unknown>(path: string, body: TBody): Promise<T> {
    return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  },

  del<T = void>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};
