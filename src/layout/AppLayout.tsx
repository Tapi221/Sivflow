import React, { Suspense, useEffect, useRef, useState } from "react";
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
  const [instantFolderId, setInstantFolderId] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onFolderSelectionChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ folderId?: string | null }>;
      setInstantFolderId(customEvent.detail?.folderId ?? null);
    };

    window.addEventListener(
      "folders:selected-folder-changed",
      onFolderSelectionChanged as EventListener,
    );

    return () => {
      window.removeEventListener(
        "folders:selected-folder-changed",
        onFolderSelectionChanged as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!isFoldersRoute) {
      setInstantFolderId(null);
      return;
    }
    setInstantFolderId(selectedFolderId ?? null);
  }, [isFoldersRoute, selectedFolderId]);

  const effectiveFolderId = instantFolderId ?? selectedFolderId;
  const shouldHideMainSidebar =
    (isFoldersRoute && Boolean(effectiveFolderId)) ||
    ((isCardViewRoute || isCardEditRoute) && Boolean(selectedCardSetId));
  const isScrollLocked =
    isFoldersRoute ||
    isCardEditRoute ||
    isCardViewRoute ||
    /^\/study(?:\/|$)/i.test(pathname);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    // locked/unlocked に関わらず、ルート遷移時はスクロール位置を必ず初期化する。
    // overflow: hidden 状態でも scrollTop は保持されるため、明示的にリセットする。
    main.scrollTop = 0;
  }, [pathname, isScrollLocked]);

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
}




