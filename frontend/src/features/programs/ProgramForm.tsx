import { useEffect, useState, type FormEvent } from "react";

import type {
  Program,
  ProgramCreate,
  ProgramExerciseCreate,
} from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { CheckboxField } from "../../shared/components/CheckboxField";
import { ExercisePicker } from "../../shared/components/ExercisePicker";
import { NumberField } from "../../shared/components/NumberField";
import { TextareaField } from "../../shared/components/TextareaField";
import { TextField } from "../../shared/components/TextField";

interface PlannedExerciseDraft {
  exerciseId: string;
  setsCount: string;
  minReps: string;
  maxReps: string;
  targetWeight: string;
  targetRpe: string;
  restSeconds: string;
  notes: string;
}

interface DayDraft {
  name: string;
  exercises: PlannedExerciseDraft[];
}

interface ProgramFormProps {
  program?: Program;
  isDuplicate?: boolean;
  isPending: boolean;
  error?: string;
  onSubmit: (payload: ProgramCreate) => void;
  onCancel: () => void;
}

function emptyPlannedExercise(): PlannedExerciseDraft {
  return {
    exerciseId: "",
    setsCount: "3",
    minReps: "8",
    maxReps: "12",
    targetWeight: "",
    targetRpe: "",
    restSeconds: "90",
    notes: "",
  };
}

function optionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function ProgramForm({
  program,
  isDuplicate = false,
  isPending,
  error,
  onSubmit,
  onCancel,
}: ProgramFormProps) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<DayDraft[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setName(program ? `${isDuplicate ? "Copie de " : ""}${program.name}` : "");
    setGoal(program?.goal || "");
    setDaysPerWeek(program?.days_per_week.toString() || "1");
    setIsActive(isDuplicate ? false : program?.is_active ?? true);
    setDays(
      program?.days.map((day) => ({
        name: day.name,
        exercises: day.exercises.map((entry) => ({
          exerciseId: entry.exercise_id.toString(),
          setsCount: entry.sets_count.toString(),
          minReps: entry.min_reps?.toString() || "",
          maxReps: entry.max_reps?.toString() || "",
          targetWeight: entry.target_weight?.toString() || "",
          targetRpe: entry.target_rpe?.toString() || "",
          restSeconds: entry.rest_seconds?.toString() || "",
          notes: entry.notes || "",
        })),
      })) || [],
    );
    setLocalError(null);
  }, [isDuplicate, program]);

  function addDay() {
    setDays((current) => [
      ...current,
      {
        name: `Jour ${current.length + 1}`,
        exercises: [emptyPlannedExercise()],
      },
    ]);
  }

  function updateDay(index: number, patch: Partial<DayDraft>) {
    setDays((current) =>
      current.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)),
    );
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, patch: Partial<PlannedExerciseDraft>) {
    setDays((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((exercise, plannedIndex) =>
                plannedIndex === exerciseIndex ? { ...exercise, ...patch } : exercise,
              ),
            }
          : day,
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (days.length === 0) {
      setLocalError("Ajoutez au moins un jour au programme.");
      return;
    }
    if (days.some((day) => !day.name.trim() || day.exercises.length === 0)) {
      setLocalError("Chaque jour doit avoir un nom et au moins un exercice.");
      return;
    }
    if (days.some((day) => day.exercises.some((entry) => !entry.exerciseId))) {
      setLocalError("Sélectionnez tous les exercices du programme.");
      return;
    }

    onSubmit({
      name: name.trim(),
      goal: goal.trim() || null,
      days_per_week: Number(daysPerWeek),
      is_active: isActive,
      days: days.map((day, dayIndex) => ({
        name: day.name.trim(),
        order_index: dayIndex,
        exercises: day.exercises.map(
          (entry, exerciseIndex): ProgramExerciseCreate => ({
            exercise_id: Number(entry.exerciseId),
            order_index: exerciseIndex,
            sets_count: Number(entry.setsCount),
            min_reps: optionalNumber(entry.minReps),
            max_reps: optionalNumber(entry.maxReps),
            target_weight: optionalNumber(entry.targetWeight),
            target_rpe: optionalNumber(entry.targetRpe),
            rest_seconds: optionalNumber(entry.restSeconds),
            notes: entry.notes.trim() || null,
          }),
        ),
      })),
    });
  }

  return (
    <section className="content-panel form-panel form-panel-wide">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Planification</p>
          <h2>{isDuplicate ? "Dupliquer le programme" : program ? "Modifier le programme" : "Nouveau programme"}</h2>
        </div>
        <Button variant="ghost" size="small" onClick={onCancel}>Fermer</Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-layout">
          <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Objectif" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <NumberField
            label="Jours par semaine"
            min={1}
            max={7}
            step="1"
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(e.target.value)}
            required
          />
          <CheckboxField label="Programme actif" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </div>

        <div className="nested-section">
          <div className="section-heading compact">
            <div><h3>Jours du programme</h3><p className="muted">Définissez le contenu de chaque journée.</p></div>
            <Button variant="secondary" size="small" onClick={addDay}>Ajouter un jour</Button>
          </div>

          {days.map((day, dayIndex) => (
            <div className="nested-card" key={dayIndex}>
              <div className="nested-card-header">
                <TextField label={`Jour ${dayIndex + 1}`} value={day.name} onChange={(e) => updateDay(dayIndex, { name: e.target.value })} required />
                <Button variant="ghost" size="small" onClick={() => setDays((current) => current.filter((_, index) => index !== dayIndex))}>Supprimer le jour</Button>
              </div>

              <div className="planned-list">
                {day.exercises.map((entry, exerciseIndex) => (
                  <div className="planned-exercise" key={exerciseIndex}>
                    <div className="planned-exercise-header">
                      <h4>Exercice {exerciseIndex + 1}</h4>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => updateDay(dayIndex, { exercises: day.exercises.filter((_, index) => index !== exerciseIndex) })}
                        disabled={day.exercises.length === 1}
                      >Retirer</Button>
                    </div>
                    <div className="form-layout form-layout-dense">
                      <ExercisePicker label="Exercice" value={entry.exerciseId ? Number(entry.exerciseId) : null} onChange={(id) => updateExercise(dayIndex, exerciseIndex, { exerciseId: id.toString() })} />
                      <NumberField label="Séries" min={1} step="1" value={entry.setsCount} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { setsCount: e.target.value })} required />
                      <NumberField label="Répétitions min." min={0} step="1" value={entry.minReps} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { minReps: e.target.value })} />
                      <NumberField label="Répétitions max." min={0} step="1" value={entry.maxReps} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { maxReps: e.target.value })} />
                      <NumberField label="Charge cible (kg)" min={0} step="0.25" value={entry.targetWeight} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetWeight: e.target.value })} />
                      <NumberField label="RPE cible" min={0} max={10} step="0.5" value={entry.targetRpe} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetRpe: e.target.value })} />
                      <NumberField label="Repos (sec.)" min={0} step="1" value={entry.restSeconds} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { restSeconds: e.target.value })} />
                      <TextareaField label="Notes" value={entry.notes} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { notes: e.target.value })} rows={2} />
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="small" onClick={() => updateDay(dayIndex, { exercises: [...day.exercises, emptyPlannedExercise()] })}>Ajouter un exercice</Button>
            </div>
          ))}
        </div>

        {localError || error ? <p className="form-error" role="alert">{localError || error}</p> : null}
        <div className="form-actions">
          <Button variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending
              ? "Enregistrement…"
              : isDuplicate
                ? "Créer la copie"
                : program
                  ? "Enregistrer"
                  : "Créer le programme"}
          </Button>
        </div>
      </form>
    </section>
  );
}
