import { hydrateServerStoredGoogleCalendarAccounts } from "@/integration/googlecalendar-integration/gcal.server-account-list";

let started = false;

export const hydrateGoogleCalendarAccountsAtRuntime = (): void => {
  if (started) return;
  started = true;

  void hydrateServerStoredGoogleCalendarAccounts().then((hydratedCount) => {
    if (hydratedCount > 0) {
      window.location.reload();
    }
  }).catch((error) => {
    console.warn("[GoogleCalendar] server account hydration failed", error);
  });
};