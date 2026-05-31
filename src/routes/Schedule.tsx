import { useEffect, useState } from "react";
import { ScheduleScreen as DesktopScheduleScreen } from "@/pane.desktop/view/ScheduleScreen.desktop";
import { ScheduleScreen as MobileScheduleScreen } from "@/pane.desktop/view/ScheduleScreen.mobile";

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
  const ActiveScheduleScreen = isMobile ? MobileScheduleScreen : DesktopScheduleScreen;

  return (
    <div className="h-full min-h-0 w-full">
      <ActiveScheduleScreen />
    </div>
  );
};

export default Calendar;
