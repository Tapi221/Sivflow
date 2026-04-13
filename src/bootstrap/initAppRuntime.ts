import { startTabPresence } from "@/utils/tabPresence";

import { initGlobalChunkRecovery } from "./initGlobalChunkRecovery";
import { initManifestDebug } from "./initManifestDebug";
import { initServiceWorkerLifecycle } from "./initServiceWorkerLifecycle";

let started = false;

export const initAppRuntime = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  startTabPresence();
  initManifestDebug();
  initGlobalChunkRecovery();
  initServiceWorkerLifecycle();
};
