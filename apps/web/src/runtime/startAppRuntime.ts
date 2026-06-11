import { initAppRuntime } from "./initAppRuntime";
import { initPersistentQueue } from "@/platform/web/initPersistentQueue";



let started = false;



const startAppRuntime = () => { if (started) return;
  started = true;

  initAppRuntime();
  initPersistentQueue();
};



export { startAppRuntime };
