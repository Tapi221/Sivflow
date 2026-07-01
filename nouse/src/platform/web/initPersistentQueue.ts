import { bindPersistentQueueAutoProcessing } from "./bindPersistentQueueAutoProcessing";
import { persistentQueue } from "@/services/PersistentOfflineQueue";



const initPersistentQueue = (): void => {
  bindPersistentQueueAutoProcessing(persistentQueue);
};



export { initPersistentQueue };
