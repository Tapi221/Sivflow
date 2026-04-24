import React, { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AppShellLoadingFallback } from "@/components/loading/ScreenSkeletons";
import "./AppLayout.css";

const LoadingFallback = () => {
  return <AppShellLoadingFallback />;
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

  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(pathname);
  const isCardSetViewRoute = /^\/(?:cardsetview|cardview)(?:\/|$)/i.test(
    pathname,
  );
  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(pathname);

  const mainRef = useRef<HTMLElement | null>(null);

  const isScrollLocked =
    isFoldersRoute ||
    isCardEditRoute ||
    isCardSetViewRoute ||
    /^\/study(?:\/|$)/i.test(pathname);

  useEffect(() => {
    resetWorkspaceScroll(mainRef.current);
  }, [pathname]);

  return (
    <div className="app-layout">
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
