import { operationQueue } from "@/services/operationQueue";

let initializedUserId: string | null = null;
let detachOnlineListener: (() => void) | null = null;

const clearOnlineListener = () => {
  detachOnlineListener?.();
  detachOnlineListener = null;
};

export const initializeOperationQueue = async (userId: string) => {
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
    const handleOnline = () => {
      console.log("[Queue] Online detected, processing queue...", { userId });
      void operationQueue.processQueue();
    };

    window.addEventListener("online", handleOnline);
    detachOnlineListener = () => {
      window.removeEventListener("online", handleOnline);
    };
  }
};

export const resetOperationQueue = () => {
  clearOnlineListener();
  initializedUserId = null;
  operationQueue.reset();
};