import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import type { WorkoutSession } from "../../shared/api/types";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { formatDate } from "../../shared/utils/format";

export function WorkoutsPage() {
  const workoutsQuery = useQuery({
    queryKey: ["workouts"],
    queryFn: () => apiClient.get<WorkoutSession[]>("/api/workouts"),
  });

  if (workoutsQuery.isPending) {
    return <LoadingState label="Chargement des séances…" />;
  }
  if (workoutsQuery.error) {
    return <ErrorState error={workoutsQuery.error} onRetry={() => void workoutsQuery.refetch()} />;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Historique</p>
          <h1>Séances</h1>
          <p className="muted">Vos entraînements enregistrés</p>
        </div>
      </header>

      <section className="content-panel">
        {workoutsQuery.data.length === 0 ? (
          <p className="empty-message">Aucune séance enregistrée.</p>
        ) : (
          <div className="list-stack">
            {workoutsQuery.data.map((workout) => (
              <article className="list-row" key={workout.id}>
                <div className="date-block">
                  <span>{formatDate(workout.performed_at)}</span>
                </div>
                <div className="list-row-main">
                  <h2>{workout.name}</h2>
                  <p>
                    {workout.exercises.length} exercice(s)
                    {workout.duration_minutes !== null
                      ? ` · ${workout.duration_minutes} min`
                      : ""}
                  </p>
                </div>
                {workout.perceived_difficulty !== null ? (
                  <span className="pill">Difficulté {workout.perceived_difficulty}/10</span>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
