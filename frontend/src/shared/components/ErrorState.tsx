import { ApiError } from "../api/client";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message =
    error instanceof ApiError || error instanceof Error
      ? error.message
      : "Une erreur inattendue est survenue.";

  return (
    <div className="state state-error" role="alert">
      <strong>Impossible de charger les données</strong>
      <p>{message}</p>
      {onRetry ? (
        <button className="button button-secondary" onClick={onRetry}>
          Réessayer
        </button>
      ) : null}
    </div>
  );
}
