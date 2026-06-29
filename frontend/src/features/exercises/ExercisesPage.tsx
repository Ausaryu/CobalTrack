import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiClient, ApiError } from "../../shared/api/client";
import { getExerciseFilters, searchExercises } from "../../shared/api/exercises";
import type {
  Exercise,
  ExerciseCreate,
  UserExercise,
  UserExerciseUpdate,
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
import { useAdminView } from "../../shared/hooks/useAdminView";
import {
  getPreferredExerciseLanguage,
  getTranslatedExerciseField,
} from "../../shared/utils/exerciseTranslations";
import { resolveMediaUrl } from "../../shared/utils/training";
import { ExerciseForm } from "./ExerciseForm";
import { ExercisePersonalization } from "./ExercisePersonalization";

type EditorState = { mode: "create" } | { mode: "edit"; exercise: Exercise } | null;
type PersonalizationFlag = "is_favorite" | "is_hidden";

function getExerciseMuscleLabel(exercise: Exercise) {
  return exercise.muscle_group || exercise.target || exercise.body_part || exercise.category;
}

function ExerciseMedia({
  exercise,
  displayName,
  categoryLabel,
  isFavorite,
}: {
  exercise: Exercise;
  displayName: string;
  categoryLabel: string;
  isFavorite: boolean;
}) {
  const url = resolveMediaUrl(exercise.gif_path || exercise.image_path);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const canDisplayMedia = Boolean(url && failedUrl !== url);

  return (
    <div className="exercise-card-media">
      <span className="exercise-category-badge">{categoryLabel}</span>
      {isFavorite ? (
        <span className="exercise-favorite-badge" aria-label="Favori" title="Favori">
          ★
        </span>
      ) : null}
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
  const { isAdminView } = useAdminView();
  const preferredLanguage = getPreferredExerciseLanguage();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState>(null);
  const [personalizationTarget, setPersonalizationTarget] = useState<Exercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [loadingPersonalizationId, setLoadingPersonalizationId] = useState<number | null>(null);
  const activeMenuRef = useRef<HTMLDivElement>(null);

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
    queryKey: [
      "exercises-search",
      searchQuery,
      muscleFilter,
      equipmentFilter,
      favoriteOnly,
      pageSize,
      page,
    ],
    queryFn: () =>
      searchExercises({
        q: searchQuery || undefined,
        muscle_group: muscleFilter || undefined,
        equipment: equipmentFilter || undefined,
        favorite_only: favoriteOnly || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  const personalizationQueries = useQueries({
    queries: (exercisesQuery.data?.items ?? []).map((exercise) => ({
      queryKey: ["exercise-personalization", exercise.id] as const,
      queryFn: () =>
        apiClient.get<UserExercise | null>(`/api/exercises/${exercise.id}/personalization`),
      staleTime: 5 * 60_000,
    })),
  });

  const knownPersonalizations = useMemo(() => {
    const known = new Map<number, UserExercise | null>();
    (exercisesQuery.data?.items ?? []).forEach((exercise, index) => {
      const personalization = personalizationQueries[index]?.data;
      if (personalization !== undefined) known.set(exercise.id, personalization);
    });
    return known;
  }, [exercisesQuery.data?.items, personalizationQueries]);

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

  const preferenceMutation = useMutation({
    mutationFn: async ({
      exercise,
      flag,
    }: {
      exercise: Exercise;
      flag: PersonalizationFlag;
    }) => {
      const current = await queryClient.fetchQuery<UserExercise | null>({
        queryKey: ["exercise-personalization", exercise.id],
        queryFn: () =>
          apiClient.get<UserExercise | null>(
            `/api/exercises/${exercise.id}/personalization`,
          ),
      });
      const payload: UserExerciseUpdate = {
        custom_name: current?.custom_name ?? null,
        custom_notes: current?.custom_notes ?? null,
        is_hidden: current?.is_hidden ?? false,
        is_favorite: current?.is_favorite ?? false,
      };
      payload[flag] = !(current?.[flag] ?? false);
      return apiClient.put<UserExercise, UserExerciseUpdate>(
        `/api/exercises/${exercise.id}/personalization`,
        payload,
      );
    },
    onSuccess: (saved, { exercise }) => {
      queryClient.setQueryData(["exercise-personalization", exercise.id], saved);
      handlePersonalizationChange(exercise.id, saved);
      void queryClient.invalidateQueries({ queryKey: ["exercises-search"] });
      setOpenMenuId(null);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, muscleFilter, equipmentFilter, favoriteOnly, showHidden, pageSize]);

  useEffect(() => {
    if (openMenuId === null) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!activeMenuRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenuId]);

  const visibleItems = useMemo(() => {
    return (exercisesQuery.data?.items ?? []).filter((exercise) => {
      const personalization = knownPersonalizations.get(exercise.id);
      return showHidden || personalization?.is_hidden !== true;
    });
  }, [exercisesQuery.data?.items, showHidden, knownPersonalizations]);

  const serverTotal = exercisesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(serverTotal / pageSize));

  useEffect(() => {
    if (!exercisesQuery.isPending && page > totalPages) setPage(totalPages);
  }, [exercisesQuery.isPending, page, totalPages]);

  function handlePersonalizationChange(
    exerciseId: number,
    personalization: UserExercise | null,
  ) {
    queryClient.setQueryData(["exercise-personalization", exerciseId], personalization);
  }

  async function loadPersonalization(exerciseId: number) {
    setLoadingPersonalizationId(exerciseId);
    try {
      const personalization = await queryClient.fetchQuery<UserExercise | null>({
        queryKey: ["exercise-personalization", exerciseId],
        queryFn: () =>
          apiClient.get<UserExercise | null>(`/api/exercises/${exerciseId}/personalization`),
      });
      queryClient.setQueryData(["exercise-personalization", exerciseId], personalization);
    } finally {
      setLoadingPersonalizationId((current) => (current === exerciseId ? null : current));
    }
  }

  function toggleExerciseMenu(exerciseId: number) {
    const shouldOpen = openMenuId !== exerciseId;
    setOpenMenuId(shouldOpen ? exerciseId : null);
    if (shouldOpen && !knownPersonalizations.has(exerciseId)) {
      void loadPersonalization(exerciseId).catch(() => undefined);
    }
  }

  const saveError = saveMutation.error;
  const saveErrorMessage = saveError instanceof ApiError ? saveError.message : saveError?.message;

  return (
    <>
      <PageHeader
        eyebrow="Référentiel global"
        title="Exercices"
        description={`${serverTotal} résultat(s) pour les filtres actifs`}
        action={
          isAdminView ? (
            <Button onClick={() => setEditor({ mode: "create" })}>Nouvel exercice</Button>
          ) : undefined
        }
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
            label="Favoris uniquement"
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
        La recherche, les favoris et les filtres groupe/équipement sont traités par le serveur.
        Le filtre des exercices masqués s'applique à la page actuelle.
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
            isAdminView &&
            serverTotal === 0 &&
            !searchInput &&
            !muscleFilter &&
            !equipmentFilter ? (
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
            const categoryLabel = exercise.category || exercise.body_part || "Exercice";
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
              <article
                className={`item-card exercise-card${
                  openMenuId === exercise.id ? " exercise-card-menu-open" : ""
                }`}
                key={exercise.id}
              >
                <ExerciseMedia
                  exercise={exercise}
                  displayName={translatedName}
                  categoryLabel={categoryLabel}
                  isFavorite={personalization?.is_favorite === true}
                />
                <div className="exercise-card-content">
                  {personalization?.is_hidden ? (
                    <div className="item-card-topline">
                      <div className="badge-row">
                        <span className="badge badge-hidden">Masqué</span>
                      </div>
                    </div>
                  ) : null}
                  <div className="exercise-card-title-row">
                    <Link
                      className="exercise-card-title-link"
                      to={`/exercises/${exercise.id}`}
                      aria-label={`Voir le détail de ${translatedName}`}
                    >
                      <h2 title={translatedName}>{translatedName}</h2>
                    </Link>
                    <div
                      className="exercise-card-menu"
                      ref={openMenuId === exercise.id ? activeMenuRef : undefined}
                    >
                      <button
                        className="exercise-card-menu-trigger"
                        type="button"
                        aria-label={`Actions pour ${translatedName}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === exercise.id}
                        onClick={() => toggleExerciseMenu(exercise.id)}
                      >
                        <span aria-hidden="true">⋮</span>
                      </button>
                      {openMenuId === exercise.id ? (
                        <div className="exercise-card-menu-dropdown" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            disabled={
                              loadingPersonalizationId === exercise.id ||
                              (preferenceMutation.isPending &&
                                preferenceMutation.variables?.exercise.id === exercise.id)
                            }
                            onClick={() =>
                              preferenceMutation.mutate({ exercise, flag: "is_favorite" })
                            }
                          >
                            {loadingPersonalizationId === exercise.id
                              ? "Chargement…"
                              : personalization?.is_favorite
                                ? "Retirer des favoris"
                                : "Mettre en favoris"}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={
                              loadingPersonalizationId === exercise.id ||
                              (preferenceMutation.isPending &&
                                preferenceMutation.variables?.exercise.id === exercise.id)
                            }
                            onClick={() =>
                              preferenceMutation.mutate({ exercise, flag: "is_hidden" })
                            }
                          >
                            {personalization?.is_hidden
                              ? "Afficher l’exercice"
                              : "Masquer l’exercice"}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              setPersonalizationTarget(exercise);
                            }}
                          >
                            Personnaliser
                          </button>
                          {preferenceMutation.error &&
                          preferenceMutation.variables?.exercise.id === exercise.id ? (
                            <span className="exercise-card-menu-error" role="alert">
                              {preferenceMutation.error instanceof ApiError
                                ? preferenceMutation.error.message
                                : "Impossible de modifier la préférence."}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                  {isAdminView ? (
                    <div className="card-actions exercise-card-actions">
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
                  ) : null}
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
