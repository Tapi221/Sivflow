import { operationQueue } from "@/services/operationQueue";

let initializedUserId: string | null = null;
let detachOnlineListener: (() => void) | null = null;

const clearOnlineListener = (): void => {
  detachOnlineListener?.();
  detachOnlineListener = null;
};

const processQueueSafely = async (context: string): Promise<void> => {
  try {
    await operationQueue.processQueue();
  } catch (error) {
    console.error(`[Queue] ${context}`, error);
  }
};

export const initializeOperationQueue = async (
  userId: string,
): Promise<void> => {
  if (!userId) {
    throw new Error("[Queue] initializeOperationQueue requires userId.");
  }

  if (initializedUserId === userId) {
    return;
  }

  clearOnlineListener();

  initializedUserId = userId;
  operationQueue.bindUser(userId);

  console.log("[Queue] Initializing OperationQueue integration...", { userId });
  operationQueue.triggerProcess();

  if (typeof window !== "undefined") {
    const handleOnline = (): void => {
      console.log("[Queue] Online detected, processing queue...", { userId });
      void processQueueSafely("Online-triggered processQueue failed");
    };

    window.addEventListener("online", handleOnline);
    detachOnlineListener = (): void => {
      window.removeEventListener("online", handleOnline);
    };
  }
};

export const resetOperationQueue = (): void => {
  clearOnlineListener();
  initializedUserId = null;
  operationQueue.reset();
};
