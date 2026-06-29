import type {
  ExerciseTrackingType,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { useExercisesById } from "../../shared/hooks/useExerciseNames";
import { getTranslatedExerciseName } from "../../shared/utils/exerciseTranslations";
import {
  calculateWorkoutSetVolume,
  getWorkoutSetEffectiveWeight,
} from "../../shared/utils/exerciseTracking";
import { calculateE1RM, formatVolume, formatWeight } from "../../shared/utils/training";
import { formatDate } from "../../shared/utils/format";

interface WorkoutDetailProps {
  workout: WorkoutSession;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

interface ExerciseStats {
  totalVolume: number;
  bestWeight: number | null;
  bestE1RM: number | null;
  bestSetIndex: number;
}

function formatTrackingValues(set: WorkoutSet, trackingType: ExerciseTrackingType): string {
  const values: string[] = [];
  if (trackingType === "BODYWEIGHT_REPS" && set.bodyweight !== null) {
    values.push(`PDC ${set.bodyweight} kg`);
  }
  if (trackingType === "ASSISTED_BODYWEIGHT_REPS") {
    if (set.assistance_weight !== null) values.push(`Assistance ${set.assistance_weight} kg`);
    if (set.bodyweight !== null) values.push(`PDC ${set.bodyweight} kg`);
  }
  if (trackingType === "ADDED_BODYWEIGHT_REPS") {
    if (set.added_weight !== null) values.push(`Lest ${set.added_weight} kg`);
    if (set.bodyweight !== null) values.push(`PDC ${set.bodyweight} kg`);
  }
  if (set.duration_seconds !== null) values.push(`${set.duration_seconds} s`);
  if (set.distance_meters !== null) values.push(`${set.distance_meters} m`);
  if (set.calories !== null) values.push(`${set.calories} kcal`);
  if (set.resistance_level !== null) values.push(`Niveau ${set.resistance_level}`);
  return values.join(" · ") || "—";
}

function computeExerciseStats(
  entry: WorkoutExercise,
  trackingType: ExerciseTrackingType,
): ExerciseStats {
  let totalVolume = 0;
  let bestWeight: number | null = null;
  let bestE1RM: number | null = null;
  let bestSetIndex = -1;

  entry.sets.forEach((set, index) => {
    if (set.is_warmup) return;
    const effectiveWeight = getWorkoutSetEffectiveWeight(trackingType, set);
    const vol = calculateWorkoutSetVolume(trackingType, set);
    totalVolume += vol;
    const supportsE1RM = [
      "WEIGHT_REPS",
      "ASSISTED_BODYWEIGHT_REPS",
      "ADDED_BODYWEIGHT_REPS",
    ].includes(trackingType);
    const e1rm = supportsE1RM ? calculateE1RM(effectiveWeight, set.reps) : null;
    if (e1rm !== null && (bestE1RM === null || e1rm > bestE1RM)) {
      bestE1RM = e1rm;
      bestSetIndex = index;
    }
    if (effectiveWeight > 0 && (bestWeight === null || effectiveWeight > bestWeight)) {
      bestWeight = effectiveWeight;
      if (e1rm === null) bestSetIndex = index;
    }
  });

  return { totalVolume, bestWeight, bestE1RM, bestSetIndex };
}

export function WorkoutDetail({ workout, onClose, onEdit, onDuplicate }: WorkoutDetailProps) {
  const exerciseIds = workout.exercises.map((exercise) => exercise.exercise_id);
  const exercises = useExercisesById(exerciseIds);

  const totalVolume = workout.exercises.reduce((acc, entry) => {
    const trackingType = exercises.get(entry.exercise_id)?.tracking_type || "WEIGHT_REPS";
    return acc + entry.sets.reduce((setAcc, set) => {
      if (set.is_warmup) return setAcc;
      return setAcc + calculateWorkoutSetVolume(trackingType, set);
    }, 0);
  }, 0);

  return (
    <section className="content-panel detail-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{formatDate(workout.performed_at)}</p>
          <h2>{workout.name}</h2>
          <p className="muted">
            {workout.duration_minutes !== null ? `${workout.duration_minutes} min` : "Durée non renseignée"}
            {workout.perceived_difficulty !== null ? ` · difficulté ${workout.perceived_difficulty}/10` : ""}
          </p>
        </div>
        <div className="button-row">
          <Button variant="secondary" size="small" onClick={onEdit}>Modifier</Button>
          <Button variant="ghost" size="small" onClick={onDuplicate}>Dupliquer</Button>
          <Button variant="ghost" size="small" onClick={onClose}>Fermer</Button>
        </div>
      </div>

      {workout.notes ? <p className="detail-note">{workout.notes}</p> : null}

      {totalVolume > 0 ? (
        <div className="workout-total-volume">
          Volume total de la séance&nbsp;: <strong>{formatVolume(totalVolume)}</strong>
        </div>
      ) : null}

      <div className="detail-stack">
        {workout.exercises.map((entry) => {
          const trackingType =
            exercises.get(entry.exercise_id)?.tracking_type || "WEIGHT_REPS";
          const stats = computeExerciseStats(entry, trackingType);
          return (
            <article className="detail-block" key={entry.id}>
              <div className="detail-block-header">
                <h3>
                  {exercises.has(entry.exercise_id)
                    ? getTranslatedExerciseName(exercises.get(entry.exercise_id)!)
                    : `Exercice #${entry.exercise_id}`}
                </h3>
                <div className="exercise-stats-row">
                  {stats.totalVolume > 0 && (
                    <div className="exercise-stat">
                      <small>Volume</small>
                      <strong>{formatVolume(stats.totalVolume)}</strong>
                    </div>
                  )}
                  {stats.bestWeight !== null && (
                    <div className="exercise-stat">
                      <small>Charge max</small>
                      <strong>{formatWeight(stats.bestWeight)}</strong>
                    </div>
                  )}
                  {stats.bestE1RM !== null && (
                    <div className="exercise-stat">
                      <small>e1RM estimé</small>
                      <strong>{formatWeight(stats.bestE1RM)}</strong>
                    </div>
                  )}
                </div>
              </div>
              {entry.sets.length === 0 ? <p className="muted">Aucune série.</p> : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Série</th>
                        <th>Poids</th>
                        <th>Reps</th>
                        <th>Suivi spécifique</th>
                        <th>Volume</th>
                        <th>e1RM</th>
                        <th>Difficulté</th>
                        <th>Repos</th>
                        <th>Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.sets.map((set, index) => {
                        const setVolume = calculateWorkoutSetVolume(trackingType, set);
                        const effectiveWeight = getWorkoutSetEffectiveWeight(trackingType, set);
                        const setE1RM = [
                          "WEIGHT_REPS",
                          "ASSISTED_BODYWEIGHT_REPS",
                          "ADDED_BODYWEIGHT_REPS",
                        ].includes(trackingType)
                          ? calculateE1RM(effectiveWeight, set.reps)
                          : null;
                        const isBest = !set.is_warmup && index === stats.bestSetIndex;
                        return (
                          <tr key={set.id} className={isBest ? "set-row-best" : undefined}>
                            <td>
                              {index + 1}
                              {set.is_warmup ? <span className="set-flag-warmup"> E</span> : null}
                            </td>
                            <td className={isBest ? "set-best" : undefined}>{effectiveWeight > 0 ? `${effectiveWeight} kg` : "—"}</td>
                            <td>{set.reps ?? "—"}</td>
                            <td>{formatTrackingValues(set, trackingType)}</td>
                            <td>{setVolume > 0 ? `${setVolume}` : "—"}</td>
                            <td className={isBest ? "set-best" : undefined}>
                              {setE1RM !== null
                                ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(setE1RM) + " kg"
                                : "—"}
                            </td>
                            <td>{set.rpe ?? "—"}</td>
                            <td>{set.rest_seconds !== null ? `${set.rest_seconds}s` : "—"}</td>
                            <td>{set.is_failure ? "Échec" : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
