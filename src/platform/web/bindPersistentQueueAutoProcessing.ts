type AssetQueueProcessor = {
  processAssetQueue: () => Promise<void>;
};



const AUTO_PROCESS_LISTENER_KEY = "__flashcardPersistentQueueAutoProcessListenersBound";



const getAssetQueueProcessingReasonLabel = (reason: "load" | "online"): string => {
  return reason === "load" ? "読み込み完了" : "オンライン復帰";
};
const triggerAssetQueueProcessing = (
  persistentQueue: AssetQueueProcessor,
  reason: "load" | "online",
): void => {
  console.log(`[永続キュー] アセットキュー処理を開始します: ${getAssetQueueProcessingReasonLabel(reason)}`);
  void persistentQueue.processAssetQueue().catch((error) => {
    console.error("[永続キュー] 自動処理に失敗しました", {
      reason: getAssetQueueProcessingReasonLabel(reason),
      error,
    });
  });
};
const bindPersistentQueueAutoProcessing = (persistentQueue: AssetQueueProcessor): void => {
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



export { bindPersistentQueueAutoProcessing };
