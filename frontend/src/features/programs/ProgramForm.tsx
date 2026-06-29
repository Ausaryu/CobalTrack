import { useEffect, useState, type FormEvent } from "react";

import type {
  ExerciseTrackingType,
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
import {
  getExerciseTrackingTypeLabel,
  getProgramTrackingFields,
  usesBodyweightSnapshot,
} from "../../shared/utils/exerciseTracking";

interface PlannedExerciseDraft {
  exerciseId: string;
  trackingType: ExerciseTrackingType;
  setsCount: string;
  minReps: string;
  maxReps: string;
  targetWeight: string;
  targetAssistanceWeight: string;
  targetAddedWeight: string;
  targetBodyweight: string;
  targetDurationSeconds: string;
  targetDistanceMeters: string;
  targetCalories: string;
  targetResistanceLevel: string;
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
    trackingType: "WEIGHT_REPS",
    setsCount: "3",
    minReps: "8",
    maxReps: "12",
    targetWeight: "",
    targetAssistanceWeight: "",
    targetAddedWeight: "",
    targetBodyweight: "",
    targetDurationSeconds: "",
    targetDistanceMeters: "",
    targetCalories: "",
    targetResistanceLevel: "",
    targetRpe: "",
    restSeconds: "90",
    notes: "",
  };
}

function optionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function toProgramExercisePayload(
  entry: PlannedExerciseDraft,
  exerciseIndex: number,
): ProgramExerciseCreate {
  const fields = getProgramTrackingFields(entry.trackingType);
  return {
    exercise_id: Number(entry.exerciseId),
    order_index: exerciseIndex,
    sets_count: Number(entry.setsCount),
    min_reps: fields.reps ? optionalNumber(entry.minReps) : null,
    max_reps: fields.reps ? optionalNumber(entry.maxReps) : null,
    target_weight: fields.weight ? optionalNumber(entry.targetWeight) : null,
    target_assistance_weight: fields.assistanceWeight
      ? optionalNumber(entry.targetAssistanceWeight)
      : null,
    target_added_weight: fields.addedWeight
      ? optionalNumber(entry.targetAddedWeight)
      : null,
    target_bodyweight: usesBodyweightSnapshot(entry.trackingType)
      ? optionalNumber(entry.targetBodyweight)
      : null,
    target_duration_seconds: fields.duration
      ? optionalNumber(entry.targetDurationSeconds)
      : null,
    target_distance_meters: fields.distance
      ? optionalNumber(entry.targetDistanceMeters)
      : null,
    target_calories: fields.calories ? optionalNumber(entry.targetCalories) : null,
    target_resistance_level: fields.resistance
      ? optionalNumber(entry.targetResistanceLevel)
      : null,
    target_rpe: fields.rpe ? optionalNumber(entry.targetRpe) : null,
    rest_seconds: fields.rest ? optionalNumber(entry.restSeconds) : null,
    notes: entry.notes.trim() || null,
  };
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
          trackingType: "WEIGHT_REPS" as ExerciseTrackingType,
          setsCount: entry.sets_count.toString(),
          minReps: entry.min_reps?.toString() || "",
          maxReps: entry.max_reps?.toString() || "",
          targetWeight: entry.target_weight?.toString() || "",
          targetAssistanceWeight: entry.target_assistance_weight?.toString() || "",
          targetAddedWeight: entry.target_added_weight?.toString() || "",
          targetBodyweight: entry.target_bodyweight?.toString() || "",
          targetDurationSeconds: entry.target_duration_seconds?.toString() || "",
          targetDistanceMeters: entry.target_distance_meters?.toString() || "",
          targetCalories: entry.target_calories?.toString() || "",
          targetResistanceLevel: entry.target_resistance_level?.toString() || "",
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
        exercises: day.exercises.map(toProgramExercisePayload),
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
                      <ExercisePicker
                        label="Exercice"
                        value={entry.exerciseId ? Number(entry.exerciseId) : null}
                        onChange={(id, exercise) =>
                          updateExercise(dayIndex, exerciseIndex, {
                            exerciseId: id.toString(),
                            trackingType: exercise?.tracking_type || "WEIGHT_REPS",
                          })
                        }
                        onResolved={(exercise) =>
                          updateExercise(dayIndex, exerciseIndex, {
                            trackingType: exercise.tracking_type,
                          })
                        }
                      />
                      <NumberField label="Séries" min={1} step="1" value={entry.setsCount} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { setsCount: e.target.value })} required />
                      {getProgramTrackingFields(entry.trackingType).reps ? <NumberField label="Répétitions min." min={0} step="1" value={entry.minReps} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { minReps: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).reps ? <NumberField label="Répétitions max." min={0} step="1" value={entry.maxReps} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { maxReps: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).weight ? <NumberField label="Charge cible (kg)" min={0} step="0.25" value={entry.targetWeight} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetWeight: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).assistanceWeight ? <NumberField label="Assistance cible (kg)" min={0} step="0.25" value={entry.targetAssistanceWeight} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetAssistanceWeight: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).addedWeight ? <NumberField label="Lest cible (kg)" min={0} step="0.25" value={entry.targetAddedWeight} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetAddedWeight: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).duration ? <NumberField label="Durée cible (sec.)" min={0} step="1" value={entry.targetDurationSeconds} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetDurationSeconds: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).distance ? <NumberField label="Distance cible (m)" min={0} step="1" value={entry.targetDistanceMeters} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetDistanceMeters: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).calories ? <NumberField label="Calories cibles" min={0} step="1" value={entry.targetCalories} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetCalories: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).resistance ? <NumberField label="Résistance cible" min={0} step="0.5" value={entry.targetResistanceLevel} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetResistanceLevel: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).rpe ? <NumberField label="Difficulté cible" hint="Note de 1 à 10. 10 = effort maximal." min={1} max={10} step="0.5" value={entry.targetRpe} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { targetRpe: e.target.value })} /> : null}
                      {getProgramTrackingFields(entry.trackingType).rest ? <NumberField label="Repos (sec.)" min={0} step="1" value={entry.restSeconds} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { restSeconds: e.target.value })} /> : null}
                      <TextareaField label="Notes" value={entry.notes} onChange={(e) => updateExercise(dayIndex, exerciseIndex, { notes: e.target.value })} rows={2} />
                    </div>
                    <p className="tracking-type-hint">
                      Suivi : {getExerciseTrackingTypeLabel(entry.trackingType)}
                    </p>
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
