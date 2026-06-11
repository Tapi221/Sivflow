import { startTabPresence } from "@/utils/tabPresence";
import { initGlobalChunkRecovery } from "./initGlobalChunkRecovery";
import { initServiceWorkerLifecycle } from "./initServiceWorkerLifecycle";



let started = false;



const initAppRuntime = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  startTabPresence();
  initGlobalChunkRecovery();
  initServiceWorkerLifecycle();
};



export { initAppRuntime };
