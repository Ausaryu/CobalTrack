import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import type { User } from "../../shared/api/types";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";

export function ProfilePage() {
  const profileQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: () => apiClient.get<User>("/api/auth/me"),
  });

  if (profileQuery.isPending) {
    return <LoadingState label="Chargement du profil…" />;
  }
  if (profileQuery.error) {
    return <ErrorState error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Compte</p>
          <h1>Profil</h1>
          <p className="muted">Informations de votre compte CobalTrack</p>
        </div>
      </header>

      <section className="content-panel profile-panel">
        <div className="profile-avatar" aria-hidden="true">
          {profileQuery.data.username.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">Nom d’utilisateur</p>
          <h2>{profileQuery.data.username}</h2>
          <p>{profileQuery.data.is_admin ? "Administrateur" : "Utilisateur"}</p>
          <span className="status-dot active">Compte actif</span>
        </div>
      </section>
    </>
  );
}
