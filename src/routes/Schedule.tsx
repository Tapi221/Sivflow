import { lazy, Suspense, useEffect, useState } from "react";

const DesktopScheduleScreen = lazy(async () => {
  const module = await import("@/screens/ScheduleScreen.desktop");

  return { default: module.ScheduleScreen };
});
const MobileScheduleScreen = lazy(async () => {
  const module = await import("@/screens/ScheduleScreen.mobile");

  return { default: module.ScheduleScreen };
});
const MOBILE_SCHEDULE_MEDIA_QUERY = "(max-width: 767px)";
const SCHEDULE_SCREEN_FALLBACK = <div className="h-full min-h-0 w-full bg-white" />;

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
      <Suspense fallback={SCHEDULE_SCREEN_FALLBACK}>
        <ActiveScheduleScreen />
      </Suspense>
    </div>
  );
};

export default Calendar;
