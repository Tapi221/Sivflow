import { initGlobalChunkRecovery } from "@web/runtime/initGlobalChunkRecovery";
import { initServiceWorkerLifecycle } from "@web/runtime/initServiceWorkerLifecycle";
import { startTabPresence } from "@/utils/tabPresence";



let started = false;



const initAppRuntime = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  startTabPresence();
  initGlobalChunkRecovery();
  initServiceWorkerLifecycle();
};



export { initAppRuntime };
