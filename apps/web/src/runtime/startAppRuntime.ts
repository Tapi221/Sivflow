import { initPersistentQueue } from "@/platform/web/initPersistentQueue";
import { initAppRuntime } from "./initAppRuntime";



let started = false;



const startAppRuntime = () => {
  if (started) return;
  started = true;

  initAppRuntime();
  initPersistentQueue();
};



export { startAppRuntime };
