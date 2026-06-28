import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { apiClient, ApiError } from "../../shared/api/client";
import { searchPrograms } from "../../shared/api/programs";
import type { Program, ProgramCreate } from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { EmptyState } from "../../shared/components/EmptyState";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { PageHeader } from "../../shared/components/PageHeader";
import { SelectField } from "../../shared/components/SelectField";
import { TextField } from "../../shared/components/TextField";
import { ProgramDetail } from "./ProgramDetail";
import { ProgramForm } from "./ProgramForm";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; program: Program }
  | { mode: "duplicate"; program: Program }
  | null;

export function ProgramsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editor, setEditor] = useState<EditorState>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const isActiveParam =
    activeFilter === "true" ? true : activeFilter === "false" ? false : undefined;

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const programsQuery = useQuery({
    queryKey: ["programs-search", searchQuery, activeFilter, pageSize, page],
    queryFn: () =>
      searchPrograms({
        q: searchQuery || undefined,
        is_active: isActiveParam,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ["program", detailId],
    queryFn: () => apiClient.get<Program>(`/api/programs/${detailId}`),
    enabled: detailId !== null,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: ProgramCreate }) =>
      id
        ? apiClient.put<Program, ProgramCreate>(`/api/programs/${id}`, payload)
        : apiClient.post<Program, ProgramCreate>("/api/programs", payload),
    onSuccess: async (program) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["programs-search"] }),
        queryClient.invalidateQueries({ queryKey: ["program", program.id] }),
        queryClient.invalidateQueries({ queryKey: ["programs-active"] }),
      ]);
      setEditor(null);
      setDetailId(program.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.del(`/api/programs/${id}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["programs-search"] }),
        queryClient.invalidateQueries({ queryKey: ["programs-active"] }),
      ]);
      setDeleteTarget(null);
      setDetailId(null);
    },
  });

  useEffect(() => {
    const requestedDetail = Number(searchParams.get("detail"));
    if (requestedDetail > 0) {
      setDetailId(requestedDetail);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeFilter, pageSize]);

  const total = programsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const programs = programsQuery.data?.items ?? [];
  const detail = detailQuery.data ?? null;
  const saveError = saveMutation.error;

  return (
    <>
      <PageHeader
        eyebrow="Planification"
        title="Programmes"
        description="Organisez vos semaines d'entraînement"
        action={<Button onClick={() => setEditor({ mode: "create" })}>Nouveau programme</Button>}
      />

      {editor ? (
        <ProgramForm
          program={editor.mode === "edit" || editor.mode === "duplicate" ? editor.program : undefined}
          isDuplicate={editor.mode === "duplicate"}
          isPending={saveMutation.isPending}
          error={saveError instanceof ApiError ? saveError.message : saveError?.message}
          onCancel={() => setEditor(null)}
          onSubmit={(payload) => saveMutation.mutate({ id: editor.mode === "edit" ? editor.program.id : undefined, payload })}
        />
      ) : null}

      {detail && !editor ? (
        <ProgramDetail
          program={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => setEditor({ mode: "edit", program: detail })}
          onDuplicate={() => setEditor({ mode: "duplicate", program: detail })}
        />
      ) : null}

      <section className="toolbar" aria-label="Filtres des programmes">
        <TextField
          label="Rechercher"
          type="search"
          placeholder="Nom ou objectif"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <SelectField
          label="Statut"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          options={[
            { value: "", label: "Tous" },
            { value: "true", label: "Actifs" },
            { value: "false", label: "Inactifs" },
          ]}
        />
        <SelectField
          label="Par page"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          options={[10, 20, 50].map((n) => ({ value: n, label: String(n) }))}
        />
      </section>

      {programsQuery.isPending ? (
        <LoadingState label="Chargement des programmes…" />
      ) : programsQuery.error ? (
        <ErrorState error={programsQuery.error} onRetry={() => void programsQuery.refetch()} />
      ) : (
        <>
      <div className="list-summary">
        <span>{total} programme(s)</span>
        <span>Page {page} / {totalPages}</span>
      </div>

      {programs.length === 0 ? (
        <EmptyState
          title={total === 0 && !searchInput && !activeFilter ? "Aucun programme" : "Aucun résultat"}
          description={
            total === 0 && !searchInput && !activeFilter
              ? "Créez votre premier plan d'entraînement."
              : "Modifiez la recherche ou le filtre de statut."
          }
          action={
            total === 0 && !searchInput && !activeFilter ? (
              <Button onClick={() => setEditor({ mode: "create" })}>Nouveau programme</Button>
            ) : undefined
          }
        />
      ) : (
        <section className="card-grid">
          {programs.map((program) => (
            <article className="item-card" key={program.id}>
              <div className="item-card-topline">
                <span className={`status-dot${program.is_active ? " active" : ""}`}>{program.is_active ? "Actif" : "Inactif"}</span>
                <span className="muted">{program.days.length} jour(s)</span>
              </div>
              <h2>{program.name}</h2>
              <p className="item-description">{program.goal || "Aucun objectif renseigné"}</p>
              <div className="program-frequency"><strong>{program.days_per_week}</strong><span>jour(s) / semaine</span></div>
              <div className="card-actions">
                <Button variant="secondary" size="small" onClick={() => setDetailId(program.id)}>Détails</Button>
                <Button variant="ghost" size="small" onClick={() => setEditor({ mode: "edit", program })}>Modifier</Button>
                <Button variant="ghost" size="small" onClick={() => setEditor({ mode: "duplicate", program })}>Dupliquer</Button>
                <Button variant="ghost" size="small" onClick={() => setDeleteTarget(program)}>Supprimer</Button>
              </div>
            </article>
          ))}
        </section>
      )}

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Pagination des programmes">
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
        title="Supprimer ce programme ?"
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p>Le programme <strong>{deleteTarget?.name}</strong>, ses jours et exercices planifiés seront supprimés.</p>
        {deleteMutation.error ? <p className="form-error">{deleteMutation.error.message}</p> : null}
      </ConfirmDialog>
    </>
  );
}
