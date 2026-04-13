import { persistentQueue } from "@/services/PersistentOfflineQueue";

import { bindPersistentQueueAutoProcessing } from "./bindPersistentQueueAutoProcessing";

export const bootstrapPersistentQueue = (): void => {
  bindPersistentQueueAutoProcessing(persistentQueue);
};
