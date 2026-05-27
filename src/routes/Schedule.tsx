import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { CalendarToolbarMode } from "@/features/calendar/scheduleScreen.types";

const DesktopScheduleScreen = lazy(() => import("@/screens/ScheduleScreen.desktop").then((module) => ({ default: module.ScheduleScreen })));
const MobileScheduleScreen = lazy(() => import("@/screens/ScheduleScreen.mobile").then((module) => ({ default: module.ScheduleScreen })));

const MOBILE_SCHEDULE_MEDIA_QUERY = "(max-width: 767px)";

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
  const { search } = useLocation();
  const ScheduleScreen = isMobile ? MobileScheduleScreen : DesktopScheduleScreen;

  const initialActiveMode = useMemo<CalendarToolbarMode | undefined>(() => {
    const mode = new URLSearchParams(search).get("mode");

    if (mode === "calendar" || mode === "timeline" || mode === "task") {
      return mode;
    }

    return undefined;
  }, [search]);

  return (
    <div className="h-full min-h-0 w-full">
      <Suspense fallback={null}>
        <ScheduleScreen initialActiveMode={initialActiveMode} />
      </Suspense>
    </div>
  );
};

export default Calendar;
