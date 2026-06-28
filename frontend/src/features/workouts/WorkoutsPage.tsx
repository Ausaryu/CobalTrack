import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { apiClient, ApiError } from "../../shared/api/client";
import { searchWorkouts } from "../../shared/api/workouts";
import type { WorkoutCreate, WorkoutSession } from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { EmptyState } from "../../shared/components/EmptyState";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { PageHeader } from "../../shared/components/PageHeader";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { formatDate } from "../../shared/utils/format";
import { WorkoutDetail } from "./WorkoutDetail";
import { WorkoutForm } from "./WorkoutForm";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; workout: WorkoutSession }
  | { mode: "duplicate"; workout: WorkoutSession }
  | null;

export function WorkoutsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editor, setEditor] = useState<EditorState>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSession | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const workoutsQuery = useQuery({
    queryKey: ["workouts-search", searchQuery, dateFrom, dateTo, pageSize, page],
    queryFn: () =>
      searchWorkouts({
        q: searchQuery || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ["workout", detailId],
    queryFn: () => apiClient.get<WorkoutSession>(`/api/workouts/${detailId}`),
    enabled: detailId !== null,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: WorkoutCreate }) =>
      id
        ? apiClient.put<WorkoutSession, WorkoutCreate>(`/api/workouts/${id}`, payload)
        : apiClient.post<WorkoutSession, WorkoutCreate>("/api/workouts", payload),
    onSuccess: async (workout) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workouts-search"] }),
        queryClient.invalidateQueries({ queryKey: ["workout", workout.id] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-progress"] }),
      ]);
      setEditor(null);
      setDetailId(workout.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.del(`/api/workouts/${id}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workouts-search"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["exercise-progress"] }),
      ]);
      setDeleteTarget(null);
      setDetailId(null);
    },
  });

  useEffect(() => {
    const requestedDetail = Number(searchParams.get("detail"));
    if (searchParams.get("new") === "1") {
      setEditor({ mode: "create" });
      setSearchParams({}, { replace: true });
    } else if (requestedDetail > 0) {
      setDetailId(requestedDetail);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFrom, dateTo, pageSize]);

  const total = workoutsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const workouts = workoutsQuery.data?.items ?? [];
  const detail = detailQuery.data ?? null;
  const saveError = saveMutation.error;

  return (
    <>
      <PageHeader
        eyebrow="Historique"
        title="Séances"
        description="Créez et consultez vos entraînements réalisés"
        action={<Button onClick={() => setEditor({ mode: "create" })}>Nouvelle séance</Button>}
      />

      {editor ? (
        <WorkoutForm
          workout={editor.mode === "edit" || editor.mode === "duplicate" ? editor.workout : undefined}
          isDuplicate={editor.mode === "duplicate"}
          isPending={saveMutation.isPending}
          error={saveError instanceof ApiError ? saveError.message : saveError?.message}
          onCancel={() => setEditor(null)}
          onSubmit={(payload) => saveMutation.mutate({
            id: editor.mode === "edit" ? editor.workout.id : undefined,
            payload,
          })}
        />
      ) : null}

      {detail && !editor ? (
        <WorkoutDetail
          workout={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => setEditor({ mode: "edit", workout: detail })}
          onDuplicate={() => setEditor({ mode: "duplicate", workout: detail })}
        />
      ) : null}

      <section className="toolbar" aria-label="Filtres des séances">
        <TextField
          label="Rechercher"
          type="search"
          placeholder="Nom de la séance"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <TextField
          label="Du"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          label="Au"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <SelectField
          label="Par page"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          options={[10, 20, 50].map((n) => ({ value: n, label: String(n) }))}
        />
      </section>

      {workoutsQuery.isPending ? (
        <LoadingState label="Chargement des séances…" />
      ) : workoutsQuery.error ? (
        <ErrorState error={workoutsQuery.error} onRetry={() => void workoutsQuery.refetch()} />
      ) : (
        <>
      <div className="list-summary">
        <span>{total} séance(s)</span>
        <span>Page {page} / {totalPages}</span>
      </div>

      <section className="content-panel">
        {workouts.length === 0 ? (
          <EmptyState
            title={total === 0 && !searchInput && !dateFrom && !dateTo ? "Aucune séance" : "Aucun résultat"}
            description={
              total === 0 && !searchInput && !dateFrom && !dateTo
                ? "Enregistrez votre premier entraînement et ses séries."
                : "Modifiez la recherche ou les filtres de date."
            }
            action={
              total === 0 && !searchInput && !dateFrom && !dateTo ? (
                <Button onClick={() => setEditor({ mode: "create" })}>Nouvelle séance</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="list-stack">
            {workouts.map((workout) => (
              <article className="list-row list-row-actions" key={workout.id}>
                <div className="date-block"><span>{formatDate(workout.performed_at)}</span></div>
                <div className="list-row-main">
                  <h2>{workout.name}</h2>
                  <p>{workout.exercises.length} exercice(s){workout.duration_minutes !== null ? ` · ${workout.duration_minutes} min` : ""}</p>
                </div>
                <div className="button-row">
                  <Button variant="secondary" size="small" onClick={() => setDetailId(workout.id)}>Détails</Button>
                  <Button variant="ghost" size="small" onClick={() => setEditor({ mode: "edit", workout })}>Modifier</Button>
                  <Button variant="ghost" size="small" onClick={() => setEditor({ mode: "duplicate", workout })}>Dupliquer</Button>
                  <Button variant="ghost" size="small" onClick={() => setDeleteTarget(workout)}>Supprimer</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Pagination des séances">
          <Button variant="secondary" size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Précédente
          </Button>
          <span>Page {page} sur {totalPages}</span>
          <Button variant="secondary" size="small" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivante
          </Button>
        </nav>
      ) : null}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer cette séance ?"
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p>La séance <strong>{deleteTarget?.name}</strong> et toutes ses séries seront supprimées.</p>
        {deleteMutation.error ? <p className="form-error">{deleteMutation.error.message}</p> : null}
      </ConfirmDialog>
    </>
  );
}
