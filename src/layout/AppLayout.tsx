import React, { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";

import "./AppLayout.css";
import { Sidebar } from "./Sidebar";

const LoadingFallback = () => {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#FCFBF7] bg-[radial-gradient(#D1D1D1_0.75px,transparent_0.75px)] [background-size:14px_14px] animate-in fade-in duration-300">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-600/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    </div>
  );
};

const resetWorkspaceScroll = (mainElement: HTMLElement | null) => {
  const containers = document.querySelectorAll<HTMLElement>(
    ".app-layout, .app-layout__content, .app-layout__main",
  );

  containers.forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });

  if (mainElement) {
    mainElement.scrollTop = 0;
    mainElement.scrollLeft = 0;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

export const AppLayout = () => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(pathname);
  const isCardSetViewRoute = /^\/(?:cardsetview|cardview)(?:\/|$)/i.test(
    pathname,
  );
  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(pathname);
  const isHomeOnlyMode = searchParams.get("home") === "1";
  const selectedCardSetId = searchParams.get("cardSetId");

  const mainRef = useRef<HTMLElement | null>(null);

  const shouldHideMainSidebar =
    (isFoldersRoute && !isHomeOnlyMode) ||
    ((isCardSetViewRoute || isCardEditRoute) && Boolean(selectedCardSetId));

  const isScrollLocked =
    isFoldersRoute ||
    isCardEditRoute ||
    isCardSetViewRoute ||
    /^\/study(?:\/|$)/i.test(pathname);

  useEffect(() => {
    resetWorkspaceScroll(mainRef.current);
  }, [pathname]);

  return (
    <div
      className={[
        "app-layout",
        shouldHideMainSidebar ? "app-layout--sidebar-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "app-layout__sidebar",
          shouldHideMainSidebar ? "app-layout__sidebar--hidden" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Sidebar />
      </div>

      <div className="app-layout__content">
        <main
          ref={mainRef}
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
};
