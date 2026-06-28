import { Navigate, createBrowserRouter } from "react-router-dom";

import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ExercisesPage } from "../features/exercises/ExercisesPage";
import { GuestRoute, ProtectedRoute } from "../features/auth/ProtectedRoute";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ProgramsPage } from "../features/programs/ProgramsPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { StatsPage } from "../features/stats/StatsPage";
import { WorkoutsPage } from "../features/workouts/WorkoutsPage";
import { AppLayout } from "../shared/components/AppLayout";

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/workouts", element: <WorkoutsPage /> },
          { path: "/exercises", element: <ExercisesPage /> },
          { path: "/programs", element: <ProgramsPage /> },
          { path: "/stats", element: <StatsPage /> },
          { path: "/profile", element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
