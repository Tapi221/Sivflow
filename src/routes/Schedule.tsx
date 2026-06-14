import { lazy, Suspense, useEffect, useState } from "react";
import { hasDesktopRuntime } from "@platform/runtime";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { ScheduleScreen as DesktopScheduleScreen } from "@/pane.desktop/view/Screen.Schedule.desktop";
import { WorkspaceScreen } from "@/pane.desktop/view/WorkspaceScreen";

const MOBILE_SCHEDULE_MEDIA_QUERY = "(max-width: 767px)";
const DesktopNativeScheduleScreen = lazy(() => import("@/pane.desktop/tab.desktopnative/ScheduleScreen.desktopnative").then(({ ScheduleScreenDesktopNative }) => ({ default: ScheduleScreenDesktopNative })));
const MobileScheduleScreen = lazy(() => import("@/pane.desktop/view/ScheduleScreen.mobile").then(({ ScheduleScreen }) => ({ default: ScheduleScreen })));

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
  const activeSectionKey = useWorkspaceTabsStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.sectionKey ?? null);
  const shouldUseMobileScheduleScreen = isMobile && activeSectionKey !== "library";
  const shouldUseDesktopNativeScheduleScreen = !shouldUseMobileScheduleScreen && hasDesktopRuntime();
  const ActiveScheduleScreen = shouldUseMobileScheduleScreen ? MobileScheduleScreen : shouldUseDesktopNativeScheduleScreen ? DesktopNativeScheduleScreen : DesktopScheduleScreen;
  const suspenseFallback = shouldUseMobileScheduleScreen ? <div className="h-full min-h-0 w-full" data-testid="mobile-schedule-screen" /> : null;

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
