import { bootstrapPersistentQueue } from "@/platform/web/bootstrapPersistentQueue";

import { initAppRuntime } from "./initAppRuntime";

let started = false;

export const bootstrapApp = () => {
  if (started) return;
  started = true;

  initAppRuntime();
  bootstrapPersistentQueue();
};
