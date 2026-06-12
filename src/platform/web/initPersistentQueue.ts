import { persistentQueue } from "@/services/PersistentOfflineQueue";
import { bindPersistentQueueAutoProcessing } from "@/platform/web/bindPersistentQueueAutoProcessing";

const initPersistentQueue = (): void => {
  bindPersistentQueueAutoProcessing(persistentQueue);
};

export { initPersistentQueue };
