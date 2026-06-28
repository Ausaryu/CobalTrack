import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import type { Program } from "../../shared/api/types";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";

export function ProgramsPage() {
  const programsQuery = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiClient.get<Program[]>("/api/programs"),
  });

  if (programsQuery.isPending) {
    return <LoadingState label="Chargement des programmes…" />;
  }
  if (programsQuery.error) {
    return <ErrorState error={programsQuery.error} onRetry={() => void programsQuery.refetch()} />;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Planification</p>
          <h1>Programmes</h1>
          <p className="muted">Organisez vos semaines d’entraînement</p>
        </div>
      </header>

      {programsQuery.data.length === 0 ? (
        <div className="content-panel empty-message">Aucun programme enregistré.</div>
      ) : (
        <section className="card-grid">
          {programsQuery.data.map((program) => (
            <article className="item-card" key={program.id}>
              <div className="item-card-topline">
                <span className={`status-dot${program.is_active ? " active" : ""}`}>
                  {program.is_active ? "Actif" : "Inactif"}
                </span>
                <span className="muted">{program.days.length} jour(s) configuré(s)</span>
              </div>
              <h2>{program.name}</h2>
              <p className="item-description">{program.goal || "Aucun objectif renseigné"}</p>
              <div className="program-frequency">
                <strong>{program.days_per_week}</strong>
                <span>jour(s) / semaine</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
