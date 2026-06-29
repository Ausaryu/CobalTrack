import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "../../shared/api/client";
import { Button } from "../../shared/components/Button";
import { NumberField } from "../../shared/components/NumberField";
import { useAuth } from "../auth/authStore";

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [bodyweight, setBodyweight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBodyweight(user?.current_bodyweight_kg?.toString() || "");
  }, [user?.current_bodyweight_kg]);

  if (!user) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await updateProfile({
        current_bodyweight_kg: bodyweight === "" ? null : Number(bodyweight),
      });
      setSaved(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Impossible d’enregistrer le profil.",
      );
    } finally {
      setIsSaving(false);
    }
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
          {user.username.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">Nom d’utilisateur</p>
          <h2>{user.username}</h2>
          <p>{user.is_admin ? "Administrateur" : "Utilisateur"}</p>
          <span className="status-dot active">Compte actif</span>
        </div>
      </section>

      <section className="content-panel profile-bodyweight-panel">
        <div>
          <p className="eyebrow">Valeur par défaut</p>
          <h2>Poids du corps</h2>
          <p className="muted">
            Utilisé comme snapshot lors de la création des séries au poids du corps.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <NumberField
            label="Poids du corps actuel (kg)"
            min={0}
            max={400}
            step="0.1"
            value={bodyweight}
            onChange={(event) => {
              setBodyweight(event.target.value);
              setSaved(false);
            }}
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {saved ? <p className="form-success">Poids enregistré.</p> : null}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </section>
    </>
  );
}
