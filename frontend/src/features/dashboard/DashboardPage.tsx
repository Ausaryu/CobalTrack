import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import type { ApiConfig, DashboardSummary } from "../../shared/api/types";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { formatDate, formatNumber } from "../../shared/utils/format";

export function DashboardPage() {
  const configQuery = useQuery({
    queryKey: ["api-config"],
    queryFn: () => apiClient.get<ApiConfig>("/api/config"),
  });
  const dashboardQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiClient.get<DashboardSummary>("/api/stats/dashboard"),
  });

  if (configQuery.isPending || dashboardQuery.isPending) {
    return <LoadingState label="Chargement du dashboard…" />;
  }

  const error = configQuery.error || dashboardQuery.error;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void configQuery.refetch();
          void dashboardQuery.refetch();
        }}
      />
    );
  }

  const config = configQuery.data;
  const dashboard = dashboardQuery.data;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Vue d’ensemble</p>
          <h1>{config.appName}</h1>
          <p className="muted">API v{config.apiVersion}</p>
        </div>
      </header>

      <section className="metric-grid" aria-label="Résumé de la semaine">
        <article className="metric-card metric-accent">
          <span>Séances cette semaine</span>
          <strong>{dashboard.workouts_this_week}</strong>
          <small>semaine civile en cours</small>
        </article>
        <article className="metric-card">
          <span>Volume hebdomadaire</span>
          <strong>{formatNumber(dashboard.weekly_volume)} kg</strong>
          <small>charge × répétitions</small>
        </article>
        <article className="metric-card">
          <span>Dernière séance</span>
          {dashboard.last_workout ? (
            <>
              <strong className="metric-text">{dashboard.last_workout.name}</strong>
              <small>{formatDate(dashboard.last_workout.performed_at)}</small>
            </>
          ) : (
            <>
              <strong className="metric-text">Aucune séance</strong>
              <small>Votre historique est vide</small>
            </>
          )}
        </article>
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Progression</p>
            <h2>Meilleurs volumes</h2>
          </div>
        </div>
        {dashboard.top_exercises_by_volume.length === 0 ? (
          <p className="empty-message">Les exercices apparaîtront après votre première séance.</p>
        ) : (
          <div className="ranking-list">
            {dashboard.top_exercises_by_volume.map((exercise, index) => (
              <div className="ranking-row" key={exercise.exercise_id}>
                <span className="ranking-index">{index + 1}</span>
                <strong>{exercise.exercise_name}</strong>
                <span>{formatNumber(exercise.total_volume)} kg</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
