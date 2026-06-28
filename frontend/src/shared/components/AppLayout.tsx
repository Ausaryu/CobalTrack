import { useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/authStore";

const navigation = [
  { to: "/dashboard", label: "Dashboard", marker: "D" },
  { to: "/workouts", label: "Séances", marker: "S" },
  { to: "/exercises", label: "Exercices", marker: "E" },
  { to: "/programs", label: "Programmes", marker: "P" },
  { to: "/stats", label: "Stats", marker: "T" },
  { to: "/profile", label: "Profil", marker: "U" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">C</div>
          <div>
            <strong>CobalTrack</strong>
            <span>Training log</span>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Navigation principale">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-marker" aria-hidden="true">{item.marker}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-summary">
            <span className="avatar" aria-hidden="true">
              {user?.username.slice(0, 1).toUpperCase() || "U"}
            </span>
            <span>
              <strong>{user?.username}</strong>
              <small>{user?.email}</small>
            </span>
          </div>
          <button className="button button-ghost" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-header">
          <strong>CobalTrack</strong>
          <button className="button button-ghost" onClick={handleLogout}>
            Déconnexion
          </button>
        </header>
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
