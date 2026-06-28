import { API_BASE_URL } from "../config/env";

export const AUTH_TOKEN_STORAGE_KEY = "cobaltrack.authToken";
export const AUTH_UNAUTHORIZED_EVENT = "cobaltrack:unauthorized";

interface ValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
}

type ErrorDetail =
  | string
  | ValidationIssue[]
  | { message?: string; exercise_ids?: number[] }
  | undefined;

const FRIENDLY_ERRORS: Record<string, string> = {
  "An account with this email already exists": "Un compte utilise déjà cette adresse email.",
  "Invalid email or password": "Email ou mot de passe incorrect.",
  "Invalid or expired authentication token": "Votre session a expiré. Reconnectez-vous.",
  "Exercise not found": "Exercice introuvable.",
  "Workout not found": "Séance introuvable.",
  "Program not found": "Programme introuvable.",
  "Exercise personalization not found": "Aucune personnalisation à réinitialiser.",
  "An exercise with this external_id already exists":
    "Cet identifiant externe est déjà utilisé par un exercice.",
  "The exercise could not be updated because it conflicts with existing data":
    "La modification entre en conflit avec un exercice existant.",
  "Exercise is used by a workout or program and cannot be deleted":
    "Cet exercice est utilisé dans une séance ou un programme et ne peut pas être supprimé.",
  "Unknown exercise ids": "Certains exercices sélectionnés n’existent plus.",
};

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
    return FRIENDLY_ERRORS[detail] || detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item.msg) return null;
        const field = item.loc
          ?.filter((part) => part !== "body")
          .map(String)
          .join(" → ");
        let message = item.msg
          .replace("Field required", "champ obligatoire")
          .replace("Input should be greater than or equal to", "doit être supérieur ou égal à")
          .replace("Input should be less than or equal to", "doit être inférieur ou égal à")
          .replace("Input should be greater than", "doit être supérieur à")
          .replace("String should have at least", "doit contenir au moins")
          .replace("Value error, min_reps must be less than or equal to max_reps", "plage de répétitions incohérente");
        message = message.charAt(0).toLocaleLowerCase() + message.slice(1);
        return field ? `${field} : ${message}` : message;
      })
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      return messages.join(" · ");
    }
  }

  if (
    detail &&
    typeof detail === "object" &&
    !Array.isArray(detail) &&
    detail.message
  ) {
    const suffix = detail.exercise_ids?.length
      ? ` (${detail.exercise_ids.join(", ")})`
      : "";
    return `${FRIENDLY_ERRORS[detail.message] || detail.message}${suffix}`;
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error(
      "Impossible de joindre le serveur. Vérifiez que le backend est démarré et accessible.",
    );
  }

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
