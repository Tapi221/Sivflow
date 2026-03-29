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

  const resetWorkspaceScroll = () => {
    const containers = document.querySelectorAll<HTMLElement>(
      ".app-layout, .app-layout__content, .app-layout__main",
    );

    containers.forEach((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });

    const main = mainRef.current;
    if (main) {
      main.scrollTop = 0;
      main.scrollLeft = 0;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

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
    // overflow: hidden/clip 状態でも scrollTop が保持される場合があるため、
    // フォルダ/カードセット選択のクエリ更新時も含めて、関連コンテナを明示的に初期化する。
    resetWorkspaceScroll();
    const raf1 = window.requestAnimationFrame(() => {
      resetWorkspaceScroll();
      window.requestAnimationFrame(resetWorkspaceScroll);
    });
    return () => window.cancelAnimationFrame(raf1);
  }, [pathname, isScrollLocked, selectedFolderId, selectedCardSetId]);

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




