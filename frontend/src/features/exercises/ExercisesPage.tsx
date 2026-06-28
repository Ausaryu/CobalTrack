import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import type { Exercise } from "../../shared/api/types";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";

export function ExercisesPage() {
  const exercisesQuery = useQuery({
    queryKey: ["exercises"],
    queryFn: () => apiClient.get<Exercise[]>("/api/exercises"),
  });

  if (exercisesQuery.isPending) {
    return <LoadingState label="Chargement des exercices…" />;
  }
  if (exercisesQuery.error) {
    return <ErrorState error={exercisesQuery.error} onRetry={() => void exercisesQuery.refetch()} />;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Référentiel global</p>
          <h1>Exercices</h1>
          <p className="muted">{exercisesQuery.data.length} exercice(s) disponible(s)</p>
        </div>
      </header>

      {exercisesQuery.data.length === 0 ? (
        <div className="content-panel empty-message">Aucun exercice importé pour le moment.</div>
      ) : (
        <section className="card-grid">
          {exercisesQuery.data.map((exercise) => (
            <article className="item-card" key={exercise.id}>
              <div className="item-card-topline">
                <span className="pill">{exercise.category || "Exercice"}</span>
                <span className="muted">#{exercise.id}</span>
              </div>
              <h2>{exercise.name}</h2>
              <dl className="detail-list">
                <div>
                  <dt>Groupe</dt>
                  <dd>{exercise.muscle_group || exercise.target || exercise.body_part || "—"}</dd>
                </div>
                <div>
                  <dt>Équipement</dt>
                  <dd>{exercise.equipment || "Sans équipement renseigné"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
