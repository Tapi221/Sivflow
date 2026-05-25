import { initAppRuntime } from "./initAppRuntime";
import { bootstrapGoogleCalendarAccountHydration } from "./hydrateGoogleCalendarAccounts";
import { bootstrapPersistentQueue } from "@/platform/web/bootstrapPersistentQueue";

let started = false;
export const bootstrapApp = () => {
  if (started) return;
  started = true;

  initAppRuntime();
  bootstrapPersistentQueue();
  bootstrapGoogleCalendarAccountHydration();
};
