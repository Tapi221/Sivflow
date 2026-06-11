import { initGlobalChunkRecovery } from "./initGlobalChunkRecovery";
import { initServiceWorkerLifecycle } from "./initServiceWorkerLifecycle";
import { startTabPresence } from "@/utils/tabPresence";









let started = false;









export const initAppRuntime = () => { if (started || typeof window === "undefined") return;
  started = true;

  startTabPresence();
  initGlobalChunkRecovery();
  initServiceWorkerLifecycle();
};
