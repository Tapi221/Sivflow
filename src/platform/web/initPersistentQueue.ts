import { persistentQueue } from "@/services/PersistentOfflineQueue";
import { bindPersistentQueueAutoProcessing } from "./bindPersistentQueueAutoProcessing";

const initPersistentQueue = (): void => {
  bindPersistentQueueAutoProcessing(persistentQueue);
};

export { initPersistentQueue };
