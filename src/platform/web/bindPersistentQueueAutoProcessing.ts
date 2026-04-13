type AssetQueueProcessor = {
  processAssetQueue: () => Promise<void>;
};

const AUTO_PROCESS_LISTENER_KEY =
  "__flashcardPersistentQueueAutoProcessListenersBound";

const triggerAssetQueueProcessing = (
  persistentQueue: AssetQueueProcessor,
  reason: "load" | "online",
): void => {
  console.log(`[PersistentQueue] Trigger asset queue processing: ${reason}`);
  void persistentQueue.processAssetQueue().catch((error) => {
    console.error("[PersistentQueue] Auto process failed", {
      reason,
      error,
    });
  });
};

export const bindPersistentQueueAutoProcessing = (
  persistentQueue: AssetQueueProcessor,
): void => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const target = window as Window & {
    [AUTO_PROCESS_LISTENER_KEY]?: boolean;
  };

  if (target[AUTO_PROCESS_LISTENER_KEY]) {
    return;
  }

  target[AUTO_PROCESS_LISTENER_KEY] = true;

  window.addEventListener(
    "load",
    () => {
      triggerAssetQueueProcessing(persistentQueue, "load");
    },
    { once: true },
  );

  window.addEventListener("online", () => {
    triggerAssetQueueProcessing(persistentQueue, "online");
  });

  if (document.readyState === "complete") {
    triggerAssetQueueProcessing(persistentQueue, "load");
  }
};
