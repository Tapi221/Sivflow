import { lazy, Suspense, useEffect, useState } from "react";
import { WorkspaceScreen as DesktopScheduleScreen } from "@/pane.desktop/view/WorkspaceScreen";

const MOBILE_SCHEDULE_MEDIA_QUERY = "(max-width: 767px)";
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

const Calendar = () => {
  const isMobile = useIsMobileSchedule();
  const ActiveScheduleScreen = isMobile ? MobileScheduleScreen : DesktopScheduleScreen;

  return (
    <div className="h-full min-h-0 w-full">
      <Suspense fallback={null}>
        <ActiveScheduleScreen />
      </Suspense>
    </div>
  );
};

export default Calendar;
