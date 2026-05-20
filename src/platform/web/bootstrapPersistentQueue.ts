import { bindPersistentQueueAutoProcessing } from "./bindPersistentQueueAutoProcessing";

import { persistentQueue } from "@/services/PersistentOfflineQueue";

export const bootstrapPersistentQueue = (): void => {
  bindPersistentQueueAutoProcessing(persistentQueue);
};
