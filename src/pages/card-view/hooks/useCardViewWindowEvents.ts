import { useEffect, useRef } from "react";
import { CARDVIEW_SAVE_FINISHED_EVENT } from "@/pages/card-view/constants";

interface UseCardViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  createAndFocusCard: () => Promise<boolean>;
  isGlobalEditing: boolean;
  setIsGlobalEditing: (value: boolean) => void;
  requestSave: () => void;
  requestSaveAndLockSelection: () => void;
  finishSaveSelectionLock: () => void;
  pendingExitAfterSaveRef: React.MutableRefObject<boolean>;
  pendingCreateCardAfterSaveRef: React.MutableRefObject<boolean>;
}

export function useCardViewWindowEvents({
  handleToggleViewMode,
  createAndFocusCard,
  isGlobalEditing,
  setIsGlobalEditing,
  requestSave,
  requestSaveAndLockSelection,
  finishSaveSelectionLock,
  pendingExitAfterSaveRef,
  pendingCreateCardAfterSaveRef,
}: UseCardViewWindowEventsOptions) {
  const handledSaveSignalRef = useRef<number | null>(null);

  useEffect(() => {
    window.addEventListener(
      "cardview:toggle-editing-request",
      handleToggleViewMode,
    );
    return () =>
      window.removeEventListener(
        "cardview:toggle-editing-request",
        handleToggleViewMode,
      );
  }, [handleToggleViewMode]);

  useEffect(() => {
    const handler = () => {
      pendingExitAfterSaveRef.current = false;
      pendingCreateCardAfterSaveRef.current = false;
      if (isGlobalEditing) {
        // 追加体感を優先し、新規作成を保存完了待ちにしない。
        // 現在カードの保存は並行して走らせる。
        requestSave();
      }
      void createAndFocusCard();
    };
    window.addEventListener("cardview:create-card-request", handler);
    return () => window.removeEventListener("cardview:create-card-request", handler);
  }, [
    createAndFocusCard,
    requestSave,
    isGlobalEditing,
    pendingCreateCardAfterSaveRef,
    pendingExitAfterSaveRef,
  ]);

  useEffect(() => {
    const handler = () => {
      if (isGlobalEditing) pendingExitAfterSaveRef.current = true;
      requestSaveAndLockSelection();
    };
    window.addEventListener("cardview:save-request", handler);
    return () => window.removeEventListener("cardview:save-request", handler);
  }, [
    isGlobalEditing,
    pendingExitAfterSaveRef,
    requestSaveAndLockSelection,
  ]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ saved?: boolean; signal?: number }>)
        ?.detail;
      const signal =
        typeof detail?.signal === "number" && Number.isFinite(detail.signal)
          ? detail.signal
          : null;
      if (signal != null) {
        if (handledSaveSignalRef.current === signal) return;
        handledSaveSignalRef.current = signal;
      }
      finishSaveSelectionLock();
      const saved = Boolean(detail?.saved);
      if (pendingCreateCardAfterSaveRef.current) {
        pendingCreateCardAfterSaveRef.current = false;
        if (saved) void createAndFocusCard();
        return;
      }
      if (!pendingExitAfterSaveRef.current) return;
      pendingExitAfterSaveRef.current = false;
      if (saved) setIsGlobalEditing(false);
    };
    window.addEventListener(CARDVIEW_SAVE_FINISHED_EVENT, handler);
    return () =>
      window.removeEventListener(CARDVIEW_SAVE_FINISHED_EVENT, handler);
  }, [
    createAndFocusCard,
    finishSaveSelectionLock,
    pendingCreateCardAfterSaveRef,
    pendingExitAfterSaveRef,
    setIsGlobalEditing,
  ]);
}

