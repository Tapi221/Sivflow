import { bindPersistentQueueAutoProcessing } from "@/platform/web/bindPersistentQueueAutoProcessing";
import { persistentQueue } from "@/services/PersistentOfflineQueue";

const initPersistentQueue = (): void => {
  bindPersistentQueueAutoProcessing(persistentQueue);
};

export { initPersistentQueue };
