import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingState } from "../../shared/components/LoadingState";
import { useAuth } from "./authStore";

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <LoadingState label="Restauration de la session…" fullPage />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingState label="Chargement…" fullPage />;
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
