import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import type { ExerciseProgress, ExerciseProgressPoint } from "../../shared/api/types";
import { EmptyState } from "../../shared/components/EmptyState";
import { ErrorState } from "../../shared/components/ErrorState";
import { ExercisePicker } from "../../shared/components/ExercisePicker";
import { LoadingState } from "../../shared/components/LoadingState";
import { PageHeader } from "../../shared/components/PageHeader";
import { useExerciseNames } from "../../shared/hooks/useExerciseNames";
import { formatDate, formatNumber } from "../../shared/utils/format";

export function StatsPage() {
  const [exerciseId, setExerciseId] = useState<number | null>(null);

  const progressQuery = useQuery({
    queryKey: ["exercise-progress", exerciseId],
    queryFn: () => apiClient.get<ExerciseProgress>(`/api/stats/exercises/${exerciseId}`),
    enabled: exerciseId !== null,
  });

  return (
    <>
      <PageHeader
        eyebrow="Analyse"
        title="Statistiques"
        description="Consultez votre progression exercice par exercice"
      />

      <section className="content-panel stats-selector">
        <ExercisePicker
          label="Exercice à analyser"
          value={exerciseId}
          onChange={(id) => setExerciseId(id)}
        />
      </section>

      {exerciseId === null ? (
        <EmptyState title="Sélectionnez un exercice" description="Les performances et l'historique apparaîtront ici." />
      ) : progressQuery.isPending ? (
        <LoadingState label="Calcul de la progression…" />
      ) : progressQuery.error ? (
        <ErrorState error={progressQuery.error} onRetry={() => void progressQuery.refetch()} />
      ) : progressQuery.data ? (
        <ProgressView progress={progressQuery.data} />
      ) : null}
    </>
  );
}

function ProgressChart({ history }: { history: ExerciseProgressPoint[] }) {
  const points = history.filter((p) => p.best_e1rm > 0);
  if (points.length < 2) return null;

  const W = 600;
  const H = 90;
  const PAD = { t: 8, r: 10, b: 6, l: 10 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const values = points.map((p) => p.best_e1rm);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const rangeV = maxV - minV || 1;

  const toX = (i: number) => PAD.l + (i / (points.length - 1)) * chartW;
  const toY = (v: number) => PAD.t + (1 - (v - minV) / rangeV) * chartH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.best_e1rm).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${toX(points.length - 1).toFixed(1)} ${(PAD.t + chartH).toFixed(1)} L ${PAD.l.toFixed(1)} ${(PAD.t + chartH).toFixed(1)} Z`;

  return (
    <div className="progress-chart-wrap">
      <p className="progress-chart-label">Progression e1RM</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="progress-chart" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cobalt)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--cobalt)" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#progressFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--cobalt)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.best_e1rm)} r="3.5" fill="var(--cobalt)" />
        ))}
      </svg>
      <div className="progress-chart-range">
        <span>{formatNumber(minV, 1)} kg</span>
        <span>{formatNumber(maxV, 1)} kg</span>
      </div>
    </div>
  );
}

function ProgressView({ progress }: { progress: ExerciseProgress }) {
  const exerciseNames = useExerciseNames([progress.exercise_id]);
  const exerciseName = exerciseNames.get(progress.exercise_id) || progress.exercise_name;

  return (
    <>
      <section className="metric-grid stats-metrics">
        <article className="metric-card metric-accent">
          <span>Séances</span>
          <strong>{progress.total_sessions}</strong>
          <small>{exerciseName}</small>
        </article>
        <article className="metric-card">
          <span>Charge maximale</span>
          <strong>{formatNumber(progress.max_weight, 1)} kg</strong>
          <small>meilleure série</small>
        </article>
        <article className="metric-card">
          <span>Meilleur e1RM</span>
          <strong>{formatNumber(progress.best_e1rm, 1)} kg</strong>
          <small>formule d'Epley</small>
        </article>
        <article className="metric-card">
          <span>Répétitions max</span>
          <strong>{progress.max_reps}</strong>
          <small>sur une série</small>
        </article>
        <article className="metric-card">
          <span>Meilleur volume</span>
          <strong>{formatNumber(progress.max_volume, 0)} kg</strong>
          <small>sur une séance</small>
        </article>
      </section>

      <ProgressChart history={progress.history} />

      <section className="content-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>{exerciseName}</h2>
          </div>
        </div>
        {progress.history.length === 0 ? (
          <EmptyState title="Aucune donnée" description="Cet exercice n'apparaît dans aucune de vos séances." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Charge max</th>
                  <th>Volume</th>
                  <th>e1RM</th>
                  <th>Tendance</th>
                </tr>
              </thead>
              <tbody>
                {progress.history.map((point, index) => {
                  const prev = progress.history[index - 1];
                  const trend =
                    prev && point.best_e1rm > 0 && prev.best_e1rm > 0
                      ? point.best_e1rm >= prev.best_e1rm
                        ? "up"
                        : "down"
                      : null;
                  return (
                    <tr key={`${point.performed_at}-${index}`}>
                      <td>{formatDate(point.performed_at)}</td>
                      <td>{formatNumber(point.max_weight, 1)} kg</td>
                      <td>{formatNumber(point.total_volume, 0)} kg</td>
                      <td className={trend === "up" ? "stat-up" : trend === "down" ? "stat-down" : undefined}>
                        {formatNumber(point.best_e1rm, 1)} kg
                      </td>
                      <td className="trend-cell">
                        {trend === "up" ? <span className="trend-up">+</span> : trend === "down" ? <span className="trend-down">-</span> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
