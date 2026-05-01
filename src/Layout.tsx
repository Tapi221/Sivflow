import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { GlobalSearchDialog } from "@/features/global-search/components/GlobalSearchDialog";
import type { GlobalSearchItem } from "@/features/global-search/model/globalSearchTypes";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { cn } from "@/lib/utils";
import { UI_TYPO } from "@/styles/tokens/typography";

import { useKatexLoader } from "@/hooks/platform/useKatexLoader";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { getAppTopInsetPx } from "@/platform/presentation/shellMetrics";
import { SecurityAlertBanner } from "./components/security/SecurityAlertBanner";
import { LocalDBStatusBanner } from "./components/security/LocalDBStatusBanner";
import { AppLayout } from "./layout/AppLayout";
import { DesktopWindowControls } from "./layout/DesktopWindowControls";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(location.pathname);
  const presentationTarget = usePresentationTarget();
  const isDesktopPresentation = presentationTarget === "desktop";
  const appTopInsetPx = getAppTopInsetPx({ presentationTarget });
  const registerSource = useGlobalSearchStore((state) => state.registerSource);
  const unregisterSource = useGlobalSearchStore(
    (state) => state.unregisterSource,
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);


  useKatexLoader();

  const navigationItems = useMemo<GlobalSearchItem[]>(
    () => [
      {
        id: "action:folders",
        value: "action:folders",
        kind: "action",
        iconKind: "folders",
        title: "フォルダ",
        keywords: [
          "フォルダ",
          "folders",
          "folder",
          "explorer",
          "エクスプローラー",
        ],
        priority: 100,
        onSelect: () => {
          void navigate("/folders");
        },
      },
      {
        id: "action:calendar",
        value: "action:calendar",
        kind: "action",
        iconKind: "calendar",
        title: "カレンダー",
        keywords: ["カレンダー", "calendar", "schedule", "予定"],
        priority: 96,
        onSelect: () => {
          void navigate("/calendar");
        },
      },
      {
        id: "action:gallery",
        value: "action:gallery",
        kind: "action",
        iconKind: "gallery",
        title: "ギャラリー",
        keywords: ["ギャラリー", "gallery", "images", "画像"],
        priority: 94,
        onSelect: () => {
          void navigate("/gallery");
        },
      },
      {
        id: "action:directory",
        value: "action:directory",
        kind: "action",
        iconKind: "directory",
        title: "ディレクトリ",
        keywords: ["ディレクトリ", "directory", "一覧", "list"],
        priority: 92,
        onSelect: () => {
          void navigate("/directory");
        },
      },

    ],
    [navigate],
  );

  useEffect(() => {
    registerSource({
      sourceId: "app-navigation",
      items: navigationItems,
    });

    return () => {
      unregisterSource("app-navigation");
    };
  }, [navigationItems, registerSource, unregisterSource]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const shouldLockPageScroll = isDesktopPresentation && isFoldersRoute;

    document.documentElement.classList.toggle(
      "no-page-scroll",
      shouldLockPageScroll,
    );

    return () => {
      if (!shouldLockPageScroll) return;
      document.documentElement.classList.remove("no-page-scroll");
    };
  }, [isDesktopPresentation, isFoldersRoute]);

  return (
    <div
      className={cn(
        "relative flex flex-col h-[100dvh] w-full overflow-hidden",
        UI_TYPO,
      )}
      data-presentation-target={presentationTarget}
      style={
        {
          "--app-top-inset": `${appTopInsetPx}px`,
          backgroundColor: "var(--app-bg)",
        } as React.CSSProperties
      }
    >
      <GlobalSearchDialog />


      <LocalDBStatusBanner />
      <SecurityAlertBanner />
      <DesktopWindowControls />

      <AppLayout />
    </div>
  );
};

export default Layout;
