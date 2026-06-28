import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getExerciseById, getExerciseFilters, searchExercises } from "../api/exercises";
import { Button } from "./Button";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";

interface ExercisePickerProps {
  label: string;
  value: number | null;
  onChange: (exerciseId: number) => void;
}

export function ExercisePicker({ label, value, onChange }: ExercisePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [group, setGroup] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const selectedQuery = useQuery({
    queryKey: ["exercise", value],
    queryFn: () => getExerciseById(value!),
    enabled: value !== null,
    staleTime: Infinity,
  });

  const searchQuery = useQuery({
    queryKey: ["exercise-search-picker", debouncedSearch, group],
    queryFn: () => searchExercises({ q: debouncedSearch || undefined, muscle_group: group || undefined }),
    enabled: open,
    staleTime: 30_000,
  });

  const filtersQuery = useQuery({
    queryKey: ["exercise-filters"],
    queryFn: () => getExerciseFilters(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const selected = selectedQuery.data ?? null;
  const results = searchQuery.data?.items ?? [];
  const total = searchQuery.data?.total ?? 0;
  const groups = filtersQuery.data?.muscle_groups ?? [];

  return (
    <div className="exercise-picker">
      <span className="exercise-picker-label">{label}</span>
      <button
        className="exercise-picker-current"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {selected ? (
          <>
            <strong>{selected.name}</strong>
            <small>
              {selected.muscle_group || selected.target || selected.body_part || "Groupe non renseigné"}
              {selected.equipment ? ` · ${selected.equipment}` : ""}
            </small>
          </>
        ) : value !== null && selectedQuery.isPending ? (
          <span>Chargement…</span>
        ) : (
          <span>Choisir un exercice</span>
        )}
        <b aria-hidden="true">{open ? "−" : "+"}</b>
      </button>

      {open ? (
        <div className="exercise-picker-panel">
          <div className="exercise-picker-filters">
            <TextField
              label="Rechercher"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom de l'exercice"
              autoFocus
            />
            <SelectField
              label="Groupe"
              placeholder="Tous"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              options={groups.map((item) => ({ value: item, label: item }))}
            />
          </div>
          <div className="exercise-picker-results">
            {searchQuery.isPending ? (
              <p className="exercise-picker-empty">Chargement…</p>
            ) : results.length === 0 ? (
              <p className="exercise-picker-empty">Aucun exercice ne correspond.</p>
            ) : (
              results.map((exercise) => (
                <button
                  type="button"
                  className={`exercise-option${exercise.id === value ? " selected" : ""}`}
                  key={exercise.id}
                  onClick={() => {
                    onChange(exercise.id);
                    setOpen(false);
                  }}
                >
                  <strong>{exercise.name}</strong>
                  <span>
                    {exercise.muscle_group || exercise.target || exercise.body_part || "—"}
                    {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                  </span>
                  <b>{exercise.id === value ? "Sélectionné" : "Choisir"}</b>
                </button>
              ))
            )}
          </div>
          {total > 50 ? (
            <p className="exercise-picker-limit">
              50 résultats affichés sur {total}. Affinez la recherche.
            </p>
          ) : null}
          <Button variant="ghost" size="small" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
