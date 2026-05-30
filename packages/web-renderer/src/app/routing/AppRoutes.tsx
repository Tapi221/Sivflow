import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/Layout";
import { getDevRouteElements } from "./DevRoutes";
import { ProtectedRoute } from "./ProtectedRoute";

const Schedule = lazy(() => import("@/routes/Schedule"));
const Trash = lazy(() => import("../../routes/Trash"));
const REDIRECT_TO_SCHEDULE_ROUTES = ["calendar/*", "CardEdit/*", "CardSetView/*", "CardView/*", "study/*", "library/*", "statistics/*"] as const;

const withRouteFallback = (element: ReactNode) => {
  return <Suspense fallback={null}>{element}</Suspense>;
};

const DefaultRedirect = () => {
  return <Navigate to="/schedule" replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultRedirect />} />
        <Route path="schedule" element={withRouteFallback(<Schedule />)} />
        <Route path="trash" element={withRouteFallback(<Trash />)} />
        {REDIRECT_TO_SCHEDULE_ROUTES.map((path) => (
          <Route key={path} path={path} element={<DefaultRedirect />} />
        ))}
        {getDevRouteElements()}
      </Route>

      <Route path="*" element={<Navigate to="/schedule" replace />} />
    </Routes>
  );
};
