import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/Layout";
import { BlockNoteSandboxPage } from "@/sandbox/blocknote";
import { getDevRouteElements } from "./DevRoutes";
import { ProtectedRoute } from "./ProtectedRoute";

const CardEdit = lazy(() => import("@/routes/CardEdit"));
const CardSetView = lazy(() => import("@/routes/CardSetView"));
const StudyMode = lazy(() => import("@/routes/StudyMode"));
const Schedule = lazy(() => import("@/routes/Schedule"));
const SettingScreen = lazy(() => import("@/routes/SettingScreen"));

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
        <Route path="calendar" element={<Navigate to="/schedule" replace />} />
        <Route path="tasks" element={<Navigate to="/schedule" replace />} />
        <Route path="settings" element={withRouteFallback(<SettingScreen />)} />

        <Route path="CardEdit" element={withRouteFallback(<CardEdit />)} />
        <Route
          path="CardSetView"
          element={withRouteFallback(<CardSetView />)}
        />
        <Route path="CardView" element={<Navigate to="/CardSetView" replace />} />
        <Route path="study" element={withRouteFallback(<StudyMode />)} />
        <Route path="sandbox/blocknote" element={<BlockNoteSandboxPage />} />

        {getDevRouteElements()}
      </Route>

      <Route path="*" element={<Navigate to="/schedule" replace />} />
    </Routes>
  );
};
