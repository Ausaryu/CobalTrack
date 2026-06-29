import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, ApiError } from "../../shared/api/client";
import type { Exercise, UserExercise, UserExerciseUpdate } from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { CheckboxField } from "../../shared/components/CheckboxField";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { TextareaField } from "../../shared/components/TextareaField";
import { TextField } from "../../shared/components/TextField";
import { getTranslatedExerciseName } from "../../shared/utils/exerciseTranslations";

interface ExercisePersonalizationProps {
  exercise: Exercise;
  onClose: () => void;
  onChange: (personalization: UserExercise | null) => void;
}

export function ExercisePersonalization({ exercise, onClose, onChange }: ExercisePersonalizationProps) {
  const notified = useRef(false);
  const query = useQuery({
    queryKey: ["exercise-personalization", exercise.id],
    queryFn: () =>
      apiClient.get<UserExercise | null>(`/api/exercises/${exercise.id}/personalization`),
  });

  useEffect(() => {
    if (query.isSuccess && !notified.current) {
      notified.current = true;
      onChange(query.data);
    }
  }, [onChange, query.data, query.isSuccess]);

  if (query.isPending) return <LoadingState label="Chargement de la personnalisation…" />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <PersonalizationEditor
      key={query.data?.updated_at || `new-${exercise.id}`}
      exercise={exercise}
      personalization={query.data}
      onClose={onClose}
      onChange={onChange}
    />
  );
}

function PersonalizationEditor({
  exercise,
  personalization,
  onClose,
  onChange,
}: ExercisePersonalizationProps & { personalization: UserExercise | null }) {
  const queryClient = useQueryClient();
  const translatedName = getTranslatedExerciseName(exercise);
  const [customName, setCustomName] = useState(personalization?.custom_name || "");
  const [customNotes, setCustomNotes] = useState(personalization?.custom_notes || "");
  const [isFavorite, setIsFavorite] = useState(personalization?.is_favorite || false);
  const [isHidden, setIsHidden] = useState(personalization?.is_hidden || false);

  const saveMutation = useMutation({
    mutationFn: (payload: UserExerciseUpdate) =>
      apiClient.put<UserExercise, UserExerciseUpdate>(
        `/api/exercises/${exercise.id}/personalization`,
        payload,
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(["exercise-personalization", exercise.id], saved);
      onChange(saved);
      onClose();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => apiClient.del(`/api/exercises/${exercise.id}/personalization`),
    onSuccess: () => {
      queryClient.setQueryData(["exercise-personalization", exercise.id], null);
      onChange(null);
      onClose();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate({
      custom_name: customName.trim() || null,
      custom_notes: customNotes.trim() || null,
      is_favorite: isFavorite,
      is_hidden: isHidden,
    });
  }

  const mutationError = saveMutation.error || deleteMutation.error;
  const errorMessage =
    mutationError instanceof ApiError ? mutationError.message : mutationError?.message;

  return (
    <section className="content-panel form-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Préférences personnelles</p>
          <h2>{translatedName}</h2>
        </div>
        <Button variant="ghost" size="small" onClick={onClose}>Fermer</Button>
      </div>
      <form className="form-layout" onSubmit={handleSubmit}>
        <TextField
          label="Nom personnalisé"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={translatedName}
        />
        <TextareaField
          label="Notes personnelles"
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          rows={3}
        />
        <div className="checkbox-group form-span">
          <CheckboxField
            label="Ajouter aux favoris"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
          />
          <CheckboxField
            label="Masquer cet exercice"
            checked={isHidden}
            onChange={(e) => setIsHidden(e.target.checked)}
          />
        </div>
        {errorMessage ? <p className="form-error form-span">{errorMessage}</p> : null}
        <div className="form-actions form-span form-actions-between">
          <div>
            {personalization ? (
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                Réinitialiser
              </Button>
            ) : null}
          </div>
          <div className="button-row">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
