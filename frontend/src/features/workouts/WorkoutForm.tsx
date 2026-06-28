import { useEffect, useState, type FormEvent } from "react";

import type {
  WorkoutCreate,
  WorkoutSession,
  WorkoutSetCreate,
} from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { CheckboxField } from "../../shared/components/CheckboxField";
import { ExercisePicker } from "../../shared/components/ExercisePicker";
import { NumberField } from "../../shared/components/NumberField";
import { TextareaField } from "../../shared/components/TextareaField";
import { TextField } from "../../shared/components/TextField";

interface SetDraft {
  weight: string;
  reps: string;
  rpe: string;
  restSeconds: string;
  isWarmup: boolean;
  isFailure: boolean;
}

interface ExerciseDraft {
  exerciseId: string;
  sets: SetDraft[];
}

interface WorkoutFormProps {
  workout?: WorkoutSession;
  isDuplicate?: boolean;
  isPending: boolean;
  error?: string;
  onSubmit: (payload: WorkoutCreate) => void;
  onCancel: () => void;
}

function emptySet(): SetDraft {
  return {
    weight: "",
    reps: "",
    rpe: "",
    restSeconds: "",
    isWarmup: false,
    isFailure: false,
  };
}

function localToday(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function optionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function cloneSet(set: SetDraft): SetDraft {
  return { ...set };
}

export function WorkoutForm({
  workout,
  isDuplicate = false,
  isPending,
  error,
  onSubmit,
  onCancel,
}: WorkoutFormProps) {
  const [name, setName] = useState("");
  const [performedAt, setPerformedAt] = useState(localToday());
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [notes, setNotes] = useState("");
  const [exerciseDrafts, setExerciseDrafts] = useState<ExerciseDraft[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setName(workout ? `${isDuplicate ? "Copie de " : ""}${workout.name}` : "");
    setPerformedAt(isDuplicate ? localToday() : workout?.performed_at || localToday());
    setDuration(workout?.duration_minutes?.toString() || "");
    setDifficulty(workout?.perceived_difficulty?.toString() || "");
    setNotes(workout?.notes || "");
    setExerciseDrafts(
      workout?.exercises.map((entry) => ({
        exerciseId: entry.exercise_id.toString(),
        sets: entry.sets.map((set) => ({
          weight: set.weight?.toString() || "",
          reps: set.reps?.toString() || "",
          rpe: set.rpe?.toString() || "",
          restSeconds: set.rest_seconds?.toString() || "",
          isWarmup: set.is_warmup,
          isFailure: set.is_failure,
        })),
      })) || [],
    );
    setLocalError(null);
  }, [isDuplicate, workout]);

  function addExercise() {
    setExerciseDrafts((current) => [
      ...current,
      { exerciseId: "", sets: [emptySet()] },
    ]);
  }

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExerciseDrafts((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function updateSet(exerciseIndex: number, setIndex: number, patch: Partial<SetDraft>) {
    setExerciseDrafts((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === exerciseIndex
          ? {
              ...entry,
              sets: entry.sets.map((set, index) =>
                index === setIndex ? { ...set, ...patch } : set,
              ),
            }
          : entry,
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (exerciseDrafts.length === 0) {
      setLocalError("Ajoutez au moins un exercice à la séance.");
      return;
    }
    if (exerciseDrafts.some((entry) => !entry.exerciseId || entry.sets.length === 0)) {
      setLocalError("Chaque exercice doit être sélectionné et contenir au moins une série.");
      return;
    }

    onSubmit({
      name: name.trim(),
      performed_at: performedAt,
      duration_minutes: optionalNumber(duration),
      perceived_difficulty: optionalNumber(difficulty),
      notes: notes.trim() || null,
      exercises: exerciseDrafts.map((entry, exerciseIndex) => ({
        exercise_id: Number(entry.exerciseId),
        order_index: exerciseIndex,
        sets: entry.sets.map(
          (set, setIndex): WorkoutSetCreate => ({
            order_index: setIndex,
            weight: optionalNumber(set.weight),
            reps: optionalNumber(set.reps),
            rpe: optionalNumber(set.rpe),
            rest_seconds: optionalNumber(set.restSeconds),
            is_warmup: set.isWarmup,
            is_failure: set.isFailure,
          }),
        ),
      })),
    });
  }

  return (
    <section className="content-panel form-panel form-panel-wide">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Séance</p>
          <h2>{isDuplicate ? "Dupliquer la séance" : workout ? "Modifier la séance" : "Nouvelle séance"}</h2>
        </div>
        <Button variant="ghost" size="small" onClick={onCancel}>Fermer</Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-layout">
          <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField
            label="Date"
            type="date"
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            required
          />
          <NumberField label="Durée (minutes)" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
          <NumberField
            label="Difficulté ressentie"
            min={1}
            max={10}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            hint="De 1 à 10"
          />
          <TextareaField
            label="Note générale"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="nested-section">
          <div className="section-heading compact">
            <div>
              <h3>Exercices et séries</h3>
              <p className="muted">Renseignez les performances réalisées.</p>
            </div>
            <Button variant="secondary" size="small" onClick={addExercise}>
              Ajouter un exercice
            </Button>
          </div>

          {exerciseDrafts.map((entry, exerciseIndex) => (
            <div className="nested-card" key={exerciseIndex}>
              <div className="nested-card-header">
                <ExercisePicker
                  label={`Exercice ${exerciseIndex + 1}`}
                  value={entry.exerciseId ? Number(entry.exerciseId) : null}
                  onChange={(id) => updateExercise(exerciseIndex, { exerciseId: id.toString() })}
                />
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setExerciseDrafts((current) => current.filter((_, index) => index !== exerciseIndex))}
                >
                  Retirer
                </Button>
              </div>

              <div className="sets-list">
                {entry.sets.map((set, setIndex) => (
                  <div className="set-row" key={setIndex}>
                    <strong>Série {setIndex + 1}</strong>
                    <NumberField label="Poids (kg)" min={0} step="0.25" value={set.weight} onChange={(e) => updateSet(exerciseIndex, setIndex, { weight: e.target.value })} />
                    <NumberField label="Répétitions" min={0} step="1" value={set.reps} onChange={(e) => updateSet(exerciseIndex, setIndex, { reps: e.target.value })} />
                    <NumberField label="RPE" min={0} max={10} step="0.5" value={set.rpe} onChange={(e) => updateSet(exerciseIndex, setIndex, { rpe: e.target.value })} />
                    <NumberField label="Repos (sec.)" min={0} step="1" value={set.restSeconds} onChange={(e) => updateSet(exerciseIndex, setIndex, { restSeconds: e.target.value })} />
                    <div className="set-flags">
                      <CheckboxField label="Échauffement" checked={set.isWarmup} onChange={(e) => updateSet(exerciseIndex, setIndex, { isWarmup: e.target.checked })} />
                      <CheckboxField label="À l’échec" checked={set.isFailure} onChange={(e) => updateSet(exerciseIndex, setIndex, { isFailure: e.target.checked })} />
                    </div>
                    <div className="set-actions">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() =>
                          updateExercise(exerciseIndex, {
                            sets: [
                              ...entry.sets.slice(0, setIndex + 1),
                              cloneSet(set),
                              ...entry.sets.slice(setIndex + 1),
                            ],
                          })
                        }
                      >
                        Ajouter identique
                      </Button>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() =>
                          updateExercise(exerciseIndex, {
                            sets: entry.sets.filter((_, index) => index !== setIndex),
                          })
                        }
                        disabled={entry.sets.length === 1}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="small"
                onClick={() =>
                  updateExercise(exerciseIndex, {
                    sets: [
                      ...entry.sets,
                      entry.sets.length > 0
                        ? cloneSet(entry.sets[entry.sets.length - 1])
                        : emptySet(),
                    ],
                  })
                }
              >
                {entry.sets.length > 0 ? "Dupliquer la série précédente" : "Ajouter une série"}
              </Button>
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
                : workout
                  ? "Enregistrer"
                  : "Créer la séance"}
          </Button>
        </div>
      </form>
    </section>
  );
}
