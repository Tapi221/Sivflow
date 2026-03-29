import React, { Suspense } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(pathname);
  const isCardViewRoute = /^\/cardview(?:\/|$)/i.test(pathname);
  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(pathname);
  const selectedFolderId = searchParams.get("folderId");
  const selectedCardSetId = searchParams.get("cardSetId");
  const shouldHideMainSidebar =
    (isFoldersRoute && Boolean(selectedFolderId)) ||
    ((isCardViewRoute || isCardEditRoute) && Boolean(selectedCardSetId));
  const isScrollLocked =
    isFoldersRoute ||
    isCardEditRoute ||
    isCardViewRoute ||
    /^\/study(?:\/|$)/i.test(pathname);

  return (
    <div
      className={[
        "app-layout",
        shouldHideMainSidebar ? "app-layout--sidebar-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!shouldHideMainSidebar && <Sidebar />}
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




