import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import "./AppLayout.css";

function LoadingFallback() {
  return (
    <div className="h-full min-h-[50vh] flex items-center justify-center animate-in fade-in duration-500">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-primary-600/10 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const isScrollLocked =
    /^\/folders(?:\/|$)/i.test(pathname) ||
    /^\/cardedit(?:\/|$)/i.test(pathname) ||
    /^\/study(?:\/|$)/i.test(pathname);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__content">
        <main
          className={[
            "app-layout__main",
            isScrollLocked ? "app-layout__main--locked" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
