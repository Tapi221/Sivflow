import { useGoogleCalendarIntegration } from "@/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration";

export const useGoogleCalendarLayer = () => {
  const {
    accountEmail,
    calendars,
    connect,
    error,
    events,
    isConnected,
    isConnecting,
    selectedCalendarIds,
    toggleCalendar,
    forceSync,
  } = useGoogleCalendarIntegration();

  return {
    accountEmail,
    calendars,
    connect,
    error,
    events,
    isConnected,
    isConnecting,
    selectedCalendarIds,
    toggleCalendar,
    forceSync,
  };
};