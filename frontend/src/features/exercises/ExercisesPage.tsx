import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiClient, ApiError } from "../../shared/api/client";
import { getExerciseFilters, searchExercises } from "../../shared/api/exercises";
import type {
  Exercise,
  ExerciseCreate,
  UserExercise,
} from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { CheckboxField } from "../../shared/components/CheckboxField";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { EmptyState } from "../../shared/components/EmptyState";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { Modal } from "../../shared/components/Modal";
import { PageHeader } from "../../shared/components/PageHeader";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import {
  getPreferredExerciseLanguage,
  getTranslatedExerciseField,
} from "../../shared/utils/exerciseTranslations";
import { resolveMediaUrl } from "../../shared/utils/training";
import { ExerciseForm } from "./ExerciseForm";
import { ExercisePersonalization } from "./ExercisePersonalization";

type EditorState = { mode: "create" } | { mode: "edit"; exercise: Exercise } | null;

function getExerciseMuscleLabel(exercise: Exercise) {
  return exercise.muscle_group || exercise.target || exercise.body_part || exercise.category;
}

function ExerciseMedia({ exercise, displayName }: { exercise: Exercise; displayName: string }) {
  const url = resolveMediaUrl(exercise.gif_path || exercise.image_path);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const canDisplayMedia = Boolean(url && failedUrl !== url);

  return (
    <div className="exercise-card-media">
      {canDisplayMedia ? (
        <img
          className="exercise-media"
          src={url!}
          alt={`Illustration de ${displayName}`}
          loading="lazy"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <div className="exercise-media-placeholder">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M7 11v10M11 8v16M21 8v16M25 11v10M11 16h10" />
          </svg>
          <span>Visuel indisponible</span>
        </div>
      )}
    </div>
  );
}

export function ExercisesPage() {
  const queryClient = useQueryClient();
  const preferredLanguage = getPreferredExerciseLanguage();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [knownPersonalizations, setKnownPersonalizations] = useState(
    () => {
      const known = new Map<number, UserExercise | null>();
      queryClient
        .getQueriesData<UserExercise | null>({ queryKey: ["exercise-personalization"] })
        .forEach(([queryKey, data]) => {
          const exerciseId = queryKey[1];
          if (typeof exerciseId === "number" && data !== undefined) known.set(exerciseId, data);
        });
      return known;
    },
  );
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState>(null);
  const [personalizationTarget, setPersonalizationTarget] = useState<Exercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);

  const filtersQuery = useQuery({
    queryKey: ["exercise-filters"],
    queryFn: () => getExerciseFilters(),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const exercisesQuery = useQuery({
    queryKey: ["exercises-search", searchQuery, muscleFilter, equipmentFilter, pageSize, page],
    queryFn: () =>
      searchExercises({
        q: searchQuery || undefined,
        muscle_group: muscleFilter || undefined,
        equipment: equipmentFilter || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: ExerciseCreate }) =>
      id
        ? apiClient.put<Exercise, ExerciseCreate>(`/api/exercises/${id}`, payload)
        : apiClient.post<Exercise, ExerciseCreate>("/api/exercises", payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercises-search"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-filters"] }),
        queryClient.invalidateQueries({ queryKey: ["exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-progress"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      setEditor(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.del(`/api/exercises/${id}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercises-search"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-filters"] }),
        queryClient.invalidateQueries({ queryKey: ["exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-progress"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, muscleFilter, equipmentFilter, favoriteOnly, showHidden, pageSize]);

  const visibleItems = useMemo(() => {
    return (exercisesQuery.data?.items ?? []).filter((exercise) => {
      const personalization = knownPersonalizations.get(exercise.id);
      return (
        (!favoriteOnly || personalization?.is_favorite === true) &&
        (showHidden || personalization?.is_hidden !== true)
      );
    });
  }, [exercisesQuery.data?.items, favoriteOnly, showHidden, knownPersonalizations]);

  const serverTotal = exercisesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(serverTotal / pageSize));

  useEffect(() => {
    if (!exercisesQuery.isPending && page > totalPages) setPage(totalPages);
  }, [exercisesQuery.isPending, page, totalPages]);

  const handlePersonalizationChange = useCallback(
    (exerciseId: number, personalization: UserExercise | null) => {
      setKnownPersonalizations((current) => {
        const next = new Map(current);
        next.set(exerciseId, personalization);
        return next;
      });
    },
    [],
  );

  const saveError = saveMutation.error;
  const saveErrorMessage = saveError instanceof ApiError ? saveError.message : saveError?.message;

  return (
    <>
      <PageHeader
        eyebrow="Référentiel global"
        title="Exercices"
        description={`${serverTotal} résultat(s) pour les filtres actifs`}
        action={<Button onClick={() => setEditor({ mode: "create" })}>Nouvel exercice</Button>}
      />

      <Modal
        title={editor?.mode === "edit" ? "Modifier l’exercice" : "Nouvel exercice"}
        isOpen={editor !== null}
        onClose={() => {
          if (!saveMutation.isPending) setEditor(null);
        }}
      >
        {editor ? (
          <ExerciseForm
            exercise={editor.mode === "edit" ? editor.exercise : undefined}
            isPending={saveMutation.isPending}
            error={saveErrorMessage}
            onCancel={() => setEditor(null)}
            onSubmit={(payload) =>
              saveMutation.mutate({
                id: editor.mode === "edit" ? editor.exercise.id : undefined,
                payload,
              })
            }
          />
        ) : null}
      </Modal>

      <Modal
        title={personalizationTarget ? `Personnaliser ${personalizationTarget.name}` : "Personnalisation"}
        isOpen={personalizationTarget !== null}
        onClose={() => setPersonalizationTarget(null)}
      >
        {personalizationTarget ? (
          <ExercisePersonalization
            key={personalizationTarget.id}
            exercise={personalizationTarget}
            onClose={() => setPersonalizationTarget(null)}
            onChange={(personalization) =>
              handlePersonalizationChange(personalizationTarget.id, personalization)
            }
          />
        ) : null}
      </Modal>

      <section className="toolbar" aria-label="Filtres des exercices">
        <TextField
          label="Rechercher"
          type="search"
          placeholder="Nom de l'exercice"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <SelectField
          label="Groupe musculaire"
          placeholder="Tous les groupes"
          value={muscleFilter}
          onChange={(event) => setMuscleFilter(event.target.value)}
          options={(filtersQuery.data?.muscle_groups ?? []).map((g) => ({ value: g, label: g }))}
        />
        <SelectField
          label="Équipement"
          placeholder="Tous les équipements"
          value={equipmentFilter}
          onChange={(event) => setEquipmentFilter(event.target.value)}
          options={(filtersQuery.data?.equipment ?? []).map((e) => ({ value: e, label: e }))}
        />
        <SelectField
          label="Par page"
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
          options={[25, 50, 100].map((size) => ({ value: size, label: size.toString() }))}
        />
        <div className="filter-toggles">
          <CheckboxField
            label="Favoris connus"
            checked={favoriteOnly}
            onChange={(event) => setFavoriteOnly(event.target.checked)}
          />
          <CheckboxField
            label="Afficher les masqués connus"
            checked={showHidden}
            onChange={(event) => setShowHidden(event.target.checked)}
          />
        </div>
      </section>

      {filtersQuery.isPending || exercisesQuery.isPending ? (
        <LoadingState label="Chargement des exercices…" />
      ) : filtersQuery.error || exercisesQuery.error ? (
        <ErrorState
          error={filtersQuery.error ?? exercisesQuery.error}
          onRetry={() => {
            void filtersQuery.refetch();
            void exercisesQuery.refetch();
          }}
        />
      ) : (
        <>
      <div className="list-summary">
        <span>{serverTotal} résultat(s) serveur</span>
        <span>{visibleItems.length} affichés</span>
        <span>Page {page} / {totalPages}</span>
      </div>
      <p className="filter-note">
        Les filtres favoris et masqués s'appliquent localement sur la page actuelle.
        La recherche et les filtres groupe/équipement sont traités par le serveur.
      </p>

      {visibleItems.length === 0 ? (
        <EmptyState
          title={serverTotal === 0 ? "Aucun résultat" : "Aucun résultat visible"}
          description={
            serverTotal === 0
              ? "Modifiez la recherche ou les filtres."
              : "Les filtres favoris/masqués ont réduit la liste. Modifiez-les ou ouvrez d'autres personnalisations."
          }
          action={
            serverTotal === 0 && !searchInput && !muscleFilter && !equipmentFilter ? (
              <Button onClick={() => setEditor({ mode: "create" })}>Créer un exercice</Button>
            ) : undefined
          }
        />
      ) : (
        <section className="card-grid exercise-card-grid">
          {visibleItems.map((exercise) => {
            const personalization = knownPersonalizations.get(exercise.id);
            const translatedName =
              getTranslatedExerciseField(exercise, "name", preferredLanguage) || exercise.name;
            const muscleLabel = getExerciseMuscleLabel(exercise);
            const additionalAnatomyLabels = [exercise.target, exercise.body_part].filter(
              (label, index, labels): label is string =>
                Boolean(label) &&
                label?.toLocaleLowerCase() !== muscleLabel?.toLocaleLowerCase() &&
                labels.findIndex(
                  (candidate) => candidate?.toLocaleLowerCase() === label?.toLocaleLowerCase(),
                ) === index,
            );

            return (
              <article className="item-card exercise-card" key={exercise.id}>
                <ExerciseMedia exercise={exercise} displayName={translatedName} />
                <div className="exercise-card-content">
                  <div className="item-card-topline">
                    <span className="pill">{exercise.category || "Exercice"}</span>
                    <div className="badge-row">
                      {personalization?.is_favorite && (
                        <span className="badge badge-star">Favori</span>
                      )}
                      {personalization?.is_hidden && (
                        <span className="badge badge-hidden">Masqué</span>
                      )}
                    </div>
                  </div>
                  <Link
                    className="exercise-card-title-link"
                    to={`/exercises/${exercise.id}`}
                    aria-label={`Voir le détail de ${translatedName}`}
                  >
                    <h2 title={translatedName}>{translatedName}</h2>
                  </Link>
                  <div className="exercise-tags">
                    {muscleLabel && <span className="tag tag-muscle">{muscleLabel}</span>}
                    {additionalAnatomyLabels.map((label) => (
                      <span className="tag tag-anatomy" key={label}>
                        {label}
                      </span>
                    ))}
                    {exercise.equipment && (
                      <span className="tag tag-equip">{exercise.equipment}</span>
                    )}
                  </div>
                  <div className="card-actions exercise-card-actions">
                    <Button
                      className="exercise-card-personalize"
                      variant="secondary"
                      size="small"
                      onClick={() => setPersonalizationTarget(exercise)}
                    >
                      Personnaliser
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => setEditor({ mode: "edit", exercise })}
                    >
                      Modifier
                    </Button>
                    <Button
                      className="exercise-card-delete"
                      variant="ghost"
                      size="small"
                      onClick={() => setDeleteTarget(exercise)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Pagination des exercices">
          <Button
            variant="secondary"
            size="small"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédente
          </Button>
          <span>Page {page} sur {totalPages}</span>
          <Button
            variant="secondary"
            size="small"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivante
          </Button>
        </nav>
      ) : null}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer cet exercice global ?"
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p>
          <strong>{deleteTarget?.name}</strong> sera supprimé pour tous les utilisateurs. La
          suppression sera refusée s'il est utilisé dans une séance ou un programme.
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
