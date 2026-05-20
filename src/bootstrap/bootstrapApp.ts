import { initAppRuntime } from "./initAppRuntime";

import { bootstrapPersistentQueue } from "@/platform/web/bootstrapPersistentQueue";

let started = false;
export const bootstrapApp = () => {
  if (started) return;
  started = true;

  initAppRuntime();
  bootstrapPersistentQueue();
};
