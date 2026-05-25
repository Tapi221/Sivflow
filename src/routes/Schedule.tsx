import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ScheduleScreen as DesktopScheduleScreen } from "@/screens/ScheduleScreen.desktop";
import { ScheduleScreen as MobileScheduleScreen } from "@/screens/ScheduleScreen.mobile";
import type { CalendarToolbarMode } from "@/features/calendar/scheduleScreen.types";

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
      <ScheduleScreen initialActiveMode={initialActiveMode} />
    </div>
  );
};

export default Calendar;
