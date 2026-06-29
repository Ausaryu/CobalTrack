import type { Program } from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { useExercisesById } from "../../shared/hooks/useExerciseNames";
import { getTranslatedExerciseName } from "../../shared/utils/exerciseTranslations";

interface ProgramDetailProps {
  program: Program;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

export function ProgramDetail({ program, onClose, onEdit, onDuplicate }: ProgramDetailProps) {
  const allIds = program.days.flatMap((day) => day.exercises.map((e) => e.exercise_id));
  const exercises = useExercisesById(allIds);

  return (
    <section className="content-panel detail-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{program.is_active ? "Programme actif" : "Programme inactif"}</p>
          <h2>{program.name}</h2>
          <p className="muted">{program.goal || "Aucun objectif"} · {program.days_per_week} jour(s) / semaine</p>
        </div>
        <div className="button-row">
          <Button variant="secondary" size="small" onClick={onEdit}>Modifier</Button>
          <Button variant="ghost" size="small" onClick={onDuplicate}>Dupliquer</Button>
          <Button variant="ghost" size="small" onClick={onClose}>Fermer</Button>
        </div>
      </div>
      <div className="detail-stack">
        {program.days.map((day) => (
          <article className="detail-block" key={day.id}>
            <h3>{day.name}</h3>
            {day.exercises.map((entry) => (
              <div className="planned-summary" key={entry.id}>
                <strong>
                  {exercises.has(entry.exercise_id)
                    ? getTranslatedExerciseName(exercises.get(entry.exercise_id)!)
                    : `Exercice #${entry.exercise_id}`}
                </strong>
                <span>{entry.sets_count} série(s){entry.min_reps !== null ? ` · ${entry.min_reps}` : ""}{entry.max_reps !== null ? `–${entry.max_reps} reps` : " reps"}</span>
                <small>
                  {entry.target_weight !== null ? `${entry.target_weight} kg` : ""}
                  {entry.target_assistance_weight !== null ? `Assistance ${entry.target_assistance_weight} kg` : ""}
                  {entry.target_added_weight !== null ? `Lest ${entry.target_added_weight} kg` : ""}
                  {entry.target_bodyweight !== null ? ` · PDC ${entry.target_bodyweight} kg` : ""}
                  {entry.target_duration_seconds !== null ? ` · ${entry.target_duration_seconds} s` : ""}
                  {entry.target_distance_meters !== null ? ` · ${entry.target_distance_meters} m` : ""}
                  {entry.target_calories !== null ? ` · ${entry.target_calories} kcal` : ""}
                  {entry.target_resistance_level !== null ? ` · Niveau ${entry.target_resistance_level}` : ""}
                  {entry.target_rpe !== null ? ` · Difficulté ${entry.target_rpe}` : ""}
                </small>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
