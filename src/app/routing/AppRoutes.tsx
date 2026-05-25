import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/Layout";
import { BlockNoteSandboxPage } from "@/sandbox/blocknote";
import { getDevRouteElements } from "./DevRoutes";
import { ProtectedRoute } from "./ProtectedRoute";

const Folders = lazy(() => import("@/routes/Folders"));
const CardEdit = lazy(() => import("@/routes/CardEdit"));
const CardSetView = lazy(() => import("@/routes/CardSetView"));
const StudyMode = lazy(() => import("@/routes/StudyMode"));
const Directory = lazy(() => import("@/routes/Directory"));
const Schedule = lazy(() => import("@/routes/Schedule"));
const Tasks = lazy(() => import("@/routes/Tasks"));
const SettingScreen = lazy(() => import("@/routes/SettingScreen"));

const withRouteFallback = (element: ReactNode) => {
  return <Suspense fallback={null}>{element}</Suspense>;
};

const DefaultRedirect = () => {
  return <Navigate to="/library" replace />;
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

        <Route path="library" element={withRouteFallback(<Folders />)} />
        <Route path="library/pdf" element={withRouteFallback(<Folders />)} />
        <Route path="library/flashcard" element={withRouteFallback(<Folders />)} />

        <Route path="schedule" element={withRouteFallback(<Schedule />)} />
        <Route path="calendar" element={<Navigate to="/schedule" replace />} />
        <Route path="tasks" element={withRouteFallback(<Tasks />)} />
        <Route path="settings" element={withRouteFallback(<SettingScreen />)} />

        <Route path="CardEdit" element={withRouteFallback(<CardEdit />)} />
        <Route
          path="CardSetView"
          element={withRouteFallback(<CardSetView />)}
        />
        <Route path="CardView" element={<Navigate to="/CardSetView" replace />} />
        <Route path="study" element={withRouteFallback(<StudyMode />)} />
        <Route path="sandbox/blocknote" element={<BlockNoteSandboxPage />} />

        <Route path="directory" element={withRouteFallback(<Directory />)} />

        {getDevRouteElements()}
      </Route>

      <Route path="*" element={<Navigate to="/library" replace />} />
    </Routes>
  );
};
