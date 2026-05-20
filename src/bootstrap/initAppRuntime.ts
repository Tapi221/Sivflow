import { initGlobalChunkRecovery } from "./initGlobalChunkRecovery";
import { initManifestDebug } from "./initManifestDebug";
import { initServiceWorkerLifecycle } from "./initServiceWorkerLifecycle";

import { startTabPresence } from "@/utils/tabPresence";

let started = false;
export const initAppRuntime = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  startTabPresence();
  initManifestDebug();
  initGlobalChunkRecovery();
  initServiceWorkerLifecycle();
};
