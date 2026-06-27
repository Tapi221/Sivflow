import React, { useEffect, useMemo } from "react";
import { UI_TYPO } from "@shared/design-tokens/Typography";
import { SearchDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.Search";
import { cn } from "@web-renderer/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { useKatexLoader } from "@/components/card/blocks/math/useKatexLoader";
import { LocalDBStatusBanner } from "@/components/security/LocalDBStatusBanner";
import { SecurityAlertBanner } from "@/components/security/SecurityAlertBanner";
import type { SearchItem } from "@/features/search/model/search.types";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { AppLayout } from "@/layout/AppLayout";
import { DesktopWindowControls } from "@/layout/DesktopWindowControls";
import { getAppTopInsetPx } from "@/platform/presentation/shellMetrics";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";



const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isScheduleRoute = /^\/(?:schedule|calendar)(?:\/|$)/i.test(
    location.pathname,
  );
  const presentationTarget = usePresentationTarget();
  const appTopInsetPx = getAppTopInsetPx({ presentationTarget });
  const registerSource = useSearchStore((state) => state.registerSource);
  const unregisterSource = useSearchStore(
    (state) => state.unregisterSource,
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  useKatexLoader();

  const navigationItems = useMemo<SearchItem[]>(
    () => [
      {
        id: "action:library",
        value: "action:library",
        kind: "action",
        iconKind: "folders",
        title: "ライブラリ",
        keywords: [
          "ライブラリ",
          "library",
          "フォルダ",
          "folders",
          "folder",
          "explorer",
          "エクスプローラー",
        ],
        priority: 100,
        onSelect: () => {
          void navigate("/schedule");
        },
      },
      {
        id: "action:calendar",
        value: "action:calendar",
        kind: "action",
        iconKind: "calendar",
        title: "スケジュール",
        keywords: ["スケジュール", "schedule", "予定", "カレンダー", "calendar"],
        priority: 96,
        onSelect: () => {
          void navigate("/schedule");
        },
      },
      {
        id: "action:materials",
        value: "action:materials",
        kind: "action",
        iconKind: "folders",
        title: "教材登録",
        keywords: ["教材", "教材登録", "material", "materials", "textbook", "resource"],
        priority: 92,
        onSelect: () => {
          void navigate("/materials");
        },
      },
      {
        id: "action:trash",
        value: "action:trash",
        kind: "action",
        iconKind: "trash",
        title: "ゴミ箱",
        keywords: ["ゴミ箱", "trash", "削除済み", "deleted", "復元", "restore"],
        priority: 88,
        onSelect: () => {
          void navigate("/trash");
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

    const shouldLockPageScroll = isScheduleRoute;

    document.documentElement.classList.toggle(
      "no-page-scroll",
      shouldLockPageScroll,
    );

    return () => {
      if (!shouldLockPageScroll) return;
      document.documentElement.classList.remove("no-page-scroll");
    };
  }, [isScheduleRoute]);

  return (
    <div
      className={cn(
        "relative flex flex-col h-[100dvh] w-full overflow-hidden bg-white",
        UI_TYPO,
      )}
      data-presentation-target={presentationTarget}
      style={
        {
          "--app-top-inset": `${appTopInsetPx}px`,
        } as React.CSSProperties
      }
    >
      <SearchDialog />
      <LocalDBStatusBanner />
      <SecurityAlertBanner />
      <DesktopWindowControls />
      <AppLayout />
    </div>
  );
};



export default Layout;
