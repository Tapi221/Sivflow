import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { hasDesktopRuntime } from "@platform/runtime";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { ScheduleScreen as DesktopScheduleScreen } from "@/pane.desktop/view/Screen.Schedule.desktop";
import { WorkspaceScreen } from "@/pane.desktop/view/WorkspaceScreen";

type CardSetNavigationTarget = {
  cardSetId: string;
  folderId: string | null;
};

const MOBILE_SCHEDULE_MEDIA_QUERY = "(max-width: 767px)";
const DesktopNativeScheduleScreen = lazy(() => import("@/pane.desktop/tab.desktopnative/ScheduleScreen.desktopnative").then(({ ScheduleScreenDesktopNative }) => ({ default: ScheduleScreenDesktopNative })));
const MobileScheduleScreen = lazy(() => import("@/pane.desktop/view/ScheduleScreen.mobile").then(({ ScheduleScreen }) => ({ default: ScheduleScreen })));

const parseCardSetNavigationTarget = (search: string): CardSetNavigationTarget | null => {
  const params = new URLSearchParams(search);
  const cardSetId = params.get("cardSetId");
  if (!cardSetId) return null;
  return {
    cardSetId,
    folderId: params.get("folderId"),
  };
};
const useIsMobileSchedule = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_SCHEDULE_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_SCHEDULE_MEDIA_QUERY);
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
};

const ScheduleRoute = () => {
  const isMobile = useIsMobileSchedule();
  const { search } = useLocation();
  const activeSectionKey = useWorkspaceTabsStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.sectionKey ?? null);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const cardSetNavigationTarget = useMemo(() => parseCardSetNavigationTarget(search), [search]);
  const shouldUseMobileScheduleScreen = isMobile && activeSectionKey !== "library";
  const shouldUseDesktopNativeScheduleScreen = !shouldUseMobileScheduleScreen && hasDesktopRuntime();
  const ActiveScheduleScreen = shouldUseMobileScheduleScreen ? MobileScheduleScreen : shouldUseDesktopNativeScheduleScreen ? DesktopNativeScheduleScreen : DesktopScheduleScreen;
  const suspenseFallback = shouldUseMobileScheduleScreen ? <div className="h-full min-h-0 w-full" data-testid="mobile-schedule-screen" /> : null;

  useEffect(() => {
    if (!cardSetNavigationTarget) return;
    openExplorerTab({
      title: "Library",
      explorerState: {
        isHomeOnlyMode: false,
        isSectionListMode: false,
        selectedFolderId: cardSetNavigationTarget.folderId,
        selectedItem: { type: "cardSet", id: cardSetNavigationTarget.cardSetId },
      },
    });
  }, [cardSetNavigationTarget, openExplorerTab]);

  if (activeSectionKey === "library") return <WorkspaceScreen />;

  return (
    <div className="h-full min-h-0 w-full">
      <Suspense fallback={suspenseFallback}>
        <ActiveScheduleScreen />
      </Suspense>
    </div>
  );
};

export { ScheduleRoute };
