import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@web/routing/ProtectedRoute";
import Layout from "@/Layout";
import { ScheduleRoute } from "@/routes/Schedule";



const Materials = lazy(() => import("@/routes/Materials").then((module) => ({ default: module.Materials })));
const Settings = lazy(() => import("@/routes/SettingScreen").then((module) => ({ default: module.SettingScreen })));
const Trash = lazy(() => import("@web-renderer/routes/Trash").then((module) => ({ default: module.TrashPage })));
const REDIRECT_TO_SCHEDULE_ROUTES = ["calendar/*", "CardEdit/*", "CardSetView/*", "CardView/*", "study/*", "library/*", "statistics/*"] as const;



const withRouteFallback = (element: ReactNode) => {
  return <Suspense fallback={null}>{element}</Suspense>;
};



const DefaultRedirect = () => {
  return <Navigate to="/schedule" replace />;
};
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DefaultRedirect />} />
        <Route path="schedule" element={withRouteFallback(<ScheduleRoute />)} />
        <Route path="materials" element={withRouteFallback(<Materials />)} />
        <Route path="settings" element={withRouteFallback(<Settings />)} />
        <Route path="trash" element={withRouteFallback(<Trash />)} />
        {REDIRECT_TO_SCHEDULE_ROUTES.map((path) => <Route key={path} path={path} element={<DefaultRedirect />} />)}
      </Route>
      <Route path="*" element={<Navigate to="/schedule" replace />} />
    </Routes>
  );
};



export { AppRoutes };
