import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiClient } from "../../shared/api/client";
import { searchPrograms } from "../../shared/api/programs";
import type { ApiConfig, DashboardSummary } from "../../shared/api/types";
import { EmptyState } from "../../shared/components/EmptyState";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { PageHeader } from "../../shared/components/PageHeader";
import { formatDate, formatNumber } from "../../shared/utils/format";

export function DashboardPage() {
  const configQuery = useQuery({ queryKey: ["api-config"], queryFn: () => apiClient.get<ApiConfig>("/api/config") });
  const dashboardQuery = useQuery({ queryKey: ["dashboard-summary"], queryFn: () => apiClient.get<DashboardSummary>("/api/stats/dashboard") });
  const activeProgramQuery = useQuery({
    queryKey: ["programs-active"],
    queryFn: () => searchPrograms({ is_active: true, limit: 1 }),
  });

  if (configQuery.isPending || dashboardQuery.isPending || activeProgramQuery.isPending) return <LoadingState label="Chargement du dashboard…" />;
  const error = configQuery.error || dashboardQuery.error || activeProgramQuery.error;
  if (error) return <ErrorState error={error} onRetry={() => { void configQuery.refetch(); void dashboardQuery.refetch(); void activeProgramQuery.refetch(); }} />;

  const config = configQuery.data;
  const dashboard = dashboardQuery.data;
  const activeProgram = activeProgramQuery.data?.items[0] ?? null;
  const quickLinks = [
    { to: "/workouts?new=1", label: "Nouvelle séance", description: "Enregistrer un entraînement" },
    ...(dashboard.last_workout
      ? [{ to: `/workouts?detail=${dashboard.last_workout.id}`, label: "Dernière séance", description: dashboard.last_workout.name }]
      : []),
    { to: "/exercises", label: "Exercices", description: "Rechercher dans le référentiel" },
    ...(activeProgram
      ? [{ to: `/programs?detail=${activeProgram.id}`, label: "Programme actif", description: activeProgram.name }]
      : [{ to: "/programs", label: "Programmes", description: "Planifier la semaine" }]),
    { to: "/stats", label: "Stats par exercice", description: "Voir la progression" },
  ];

  const maxVolume = dashboard.top_exercises_by_volume.reduce((m, e) => Math.max(m, e.total_volume), 0);

  return (
    <>
      <PageHeader eyebrow="Vue d'ensemble" title={config.appName} description={`API v${config.apiVersion}`} />

      <section className="quick-actions" aria-label="Accès rapides">
        {quickLinks.map((link) => (
          <Link to={link.to} className="quick-action" key={link.to}>
            <strong>{link.label}</strong><span>{link.description}</span><b aria-hidden="true">→</b>
          </Link>
        ))}
      </section>

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
              <small>
                {formatDate(dashboard.last_workout.performed_at)}
                {dashboard.last_workout.duration_minutes !== null
                  ? ` · ${dashboard.last_workout.duration_minutes} min`
                  : ""}
              </small>
            </>
          ) : (
            <>
              <strong className="metric-text">Aucune séance</strong>
              <small>Votre historique est vide</small>
            </>
          )}
        </article>
      </section>

      <div className="dashboard-columns">
        <section className="content-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Progression</p>
              <h2>Top exercices par volume</h2>
            </div>
          </div>
          {dashboard.top_exercises_by_volume.length === 0 ? (
            <EmptyState title="Aucun volume" description="Les exercices apparaîtront après votre première séance." />
          ) : (
            <div className="ranking-list">
              {dashboard.top_exercises_by_volume.map((exercise, index) => (
                <div className="ranking-row" key={exercise.exercise_id}>
                  <span className="ranking-index">{index + 1}</span>
                  <div className="ranking-name-bar">
                    <strong>{exercise.exercise_name}</strong>
                    <div className="volume-bar">
                      <div
                        className="volume-bar-fill"
                        style={{ width: maxVolume > 0 ? `${((exercise.total_volume / maxVolume) * 100).toFixed(1)}%` : "0%" }}
                      />
                    </div>
                  </div>
                  <span className="ranking-volume">{formatNumber(exercise.total_volume)} kg</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="content-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Records</p>
              <h2>Performances récentes</h2>
            </div>
          </div>
          {dashboard.recent_records.length === 0 ? (
            <EmptyState title="Aucun record" description="Vos meilleures performances apparaîtront ici." />
          ) : (
            <div className="record-list">
              {dashboard.recent_records.map((record) => (
                <article className="record-row" key={record.exercise_id}>
                  <div>
                    <strong>{record.exercise_name}</strong>
                    <small>{formatDate(record.performed_at)}</small>
                  </div>
                  <div className="record-stats">
                    <span className="record-weight">{formatNumber(record.max_weight, 1)} kg</span>
                    <span className="record-e1rm">e1RM {formatNumber(record.best_e1rm, 1)} kg</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
