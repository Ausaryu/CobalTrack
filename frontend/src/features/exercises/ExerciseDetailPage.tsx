import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { apiClient, ApiError } from "../../shared/api/client";
import { getExerciseById } from "../../shared/api/exercises";
import type { Exercise, ExerciseCreate } from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { Modal } from "../../shared/components/Modal";
import { PageHeader } from "../../shared/components/PageHeader";
import { useAdminView } from "../../shared/hooks/useAdminView";
import {
  getPreferredExerciseLanguage,
  getTranslatedExerciseField,
  setPreferredExerciseLanguage,
  type ExerciseLanguage,
} from "../../shared/utils/exerciseTranslations";
import { resolveMediaUrl } from "../../shared/utils/training";
import { ExerciseForm } from "./ExerciseForm";
import { ExercisePersonalization } from "./ExercisePersonalization";

function ExerciseDetailMedia({ exercise, displayName }: { exercise: Exercise; displayName: string }) {
  const mediaUrl = resolveMediaUrl(exercise.gif_path || exercise.image_path);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const canDisplayMedia = Boolean(mediaUrl && failedUrl !== mediaUrl);

  return (
    <div className="exercise-detail-media">
      {canDisplayMedia ? (
        <img
          src={mediaUrl!}
          alt={`Illustration de ${displayName}`}
          onError={() => setFailedUrl(mediaUrl)}
        />
      ) : (
        <div className="exercise-detail-media-placeholder">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M7 11v10M11 8v16M21 8v16M25 11v10M11 16h10" />
          </svg>
          <span>Visuel indisponible</span>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Non renseigné"}</dd>
    </div>
  );
}

export function ExerciseDetailPage() {
  const { isAdminView } = useAdminView();
  const { exerciseId: exerciseIdParam } = useParams();
  const exerciseId = Number(exerciseIdParam);
  const hasValidId = Number.isInteger(exerciseId) && exerciseId > 0;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<ExerciseLanguage>(
    getPreferredExerciseLanguage,
  );

  const exerciseQuery = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () => getExerciseById(exerciseId),
    enabled: hasValidId,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: ExerciseCreate) =>
      apiClient.put<Exercise, ExerciseCreate>(`/api/exercises/${exerciseId}`, payload),
    onSuccess: async (savedExercise) => {
      queryClient.setQueryData(["exercise", exerciseId], savedExercise);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercises-search"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-filters"] }),
      ]);
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.del(`/api/exercises/${exerciseId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercises-search"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-filters"] }),
        queryClient.invalidateQueries({ queryKey: ["exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-progress"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      queryClient.removeQueries({ queryKey: ["exercise", exerciseId] });
      navigate("/exercises", { replace: true });
    },
  });

  if (!hasValidId) {
    return <ErrorState error={new Error("Identifiant d’exercice invalide.")} />;
  }

  if (exerciseQuery.isPending) {
    return <LoadingState label="Chargement de l’exercice…" />;
  }

  if (exerciseQuery.error) {
    return (
      <ErrorState
        error={exerciseQuery.error}
        onRetry={() => void exerciseQuery.refetch()}
      />
    );
  }

  const exercise = exerciseQuery.data;
  const saveError = saveMutation.error;
  const translatedName =
    getTranslatedExerciseField(exercise, "name", preferredLanguage) || exercise.name;
  const translatedInstructions = getTranslatedExerciseField(
    exercise,
    "instructions",
    preferredLanguage,
  );

  const closeEditor = () => {
    if (saveMutation.isPending) return;
    setIsEditing(false);
    saveMutation.reset();
  };

  return (
    <>
      <PageHeader
        eyebrow="Référentiel global"
        title={translatedName}
        description="Détail de l’exercice"
        action={
          <>
            <label className="exercise-language-selector">
              <span>Langue</span>
              <select
                value={preferredLanguage}
                onChange={(event) => {
                  const language = event.target.value as ExerciseLanguage;
                  setPreferredLanguage(language);
                  setPreferredExerciseLanguage(language);
                }}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="it">Italiano</option>
                <option value="tr">Türkçe</option>
              </select>
            </label>
            <Link className="button button-secondary" to="/exercises">
              Retour aux exercices
            </Link>
          </>
        }
      />

      <div className="exercise-detail-layout">
        <section className="content-panel exercise-detail-media-panel">
          <ExerciseDetailMedia exercise={exercise} displayName={translatedName} />
        </section>

        <section className="content-panel exercise-detail-summary">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Informations</p>
              <h2>Caractéristiques</h2>
            </div>
          </div>
          <dl className="exercise-detail-list">
            <DetailItem
              label="Groupe musculaire"
              value={getTranslatedExerciseField(exercise, "muscle_group", preferredLanguage)}
            />
            <DetailItem
              label="Partie du corps"
              value={getTranslatedExerciseField(exercise, "body_part", preferredLanguage)}
            />
            <DetailItem
              label="Cible"
              value={getTranslatedExerciseField(exercise, "target", preferredLanguage)}
            />
            <DetailItem
              label="Équipement"
              value={getTranslatedExerciseField(exercise, "equipment", preferredLanguage)}
            />
            <DetailItem
              label="Catégorie"
              value={getTranslatedExerciseField(exercise, "category", preferredLanguage)}
            />
            <DetailItem label="Source" value={exercise.source} />
            {exercise.external_id ? (
              <DetailItem label="Identifiant externe" value={exercise.external_id} />
            ) : null}
          </dl>

          <div className="exercise-detail-secondary">
            <h3>Muscles secondaires</h3>
            {exercise.secondary_muscles.length > 0 ? (
              <div className="exercise-tags">
                {exercise.secondary_muscles.map((muscle) => (
                  <span className="tag tag-anatomy" key={muscle.id}>
                    {muscle.muscle_name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">Aucun muscle secondaire renseigné.</p>
            )}
          </div>
        </section>
      </div>

      <section className="content-panel exercise-detail-instructions">
        <p className="eyebrow">Exécution</p>
        <h2>Instructions</h2>
        <p>{translatedInstructions || "Aucune instruction renseignée."}</p>
      </section>

      <div className="exercise-detail-actions">
        <Button variant="secondary" onClick={() => setIsPersonalizing(true)}>
          Personnalisation
        </Button>
        {isAdminView ? (
          <>
            <Button
              onClick={() => {
                saveMutation.reset();
                setIsEditing(true);
              }}
            >
              Modifier
            </Button>
            <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
              Supprimer
            </Button>
          </>
        ) : null}
      </div>

      <Modal title="Modifier l’exercice" isOpen={isEditing} onClose={closeEditor}>
        <ExerciseForm
          exercise={exercise}
          isPending={saveMutation.isPending}
          error={saveError instanceof ApiError ? saveError.message : saveError?.message}
          onCancel={closeEditor}
          onSubmit={(payload) => saveMutation.mutate(payload)}
        />
      </Modal>

      <Modal
        title={`Personnaliser ${translatedName}`}
        isOpen={isPersonalizing}
        onClose={() => setIsPersonalizing(false)}
      >
        <ExercisePersonalization
          exercise={exercise}
          onClose={() => setIsPersonalizing(false)}
          onChange={() => undefined}
        />
      </Modal>

      <ConfirmDialog
        open={isDeleteOpen}
        title="Supprimer cet exercice global ?"
        isPending={deleteMutation.isPending}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      >
        <p>
          <strong>{exercise.name}</strong> sera supprimé pour tous les utilisateurs. La suppression
          sera refusée s’il est utilisé dans une séance ou un programme.
        </p>
        {deleteMutation.error ? (
          <p className="form-error">
            {deleteMutation.error instanceof ApiError
              ? deleteMutation.error.message
              : deleteMutation.error.message}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
