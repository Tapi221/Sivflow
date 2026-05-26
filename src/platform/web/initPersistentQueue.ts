import { bindPersistentQueueAutoProcessing } from "./bindPersistentQueueAutoProcessing";
import { persistentQueue } from "@/services/PersistentOfflineQueue";

export const initPersistentQueue = (): void => {
  bindPersistentQueueAutoProcessing(persistentQueue);
};
