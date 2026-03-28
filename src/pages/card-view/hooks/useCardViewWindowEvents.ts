import { useEffect } from "react";
import { CARDVIEW_SAVE_FINISHED_EVENT } from "../constants";

interface UseCardViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  createAndFocusCard: () => Promise<boolean>;
  isGlobalEditing: boolean;
  setIsGlobalEditing: (value: boolean) => void;
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
  requestSaveAndLockSelection,
  finishSaveSelectionLock,
  pendingExitAfterSaveRef,
  pendingCreateCardAfterSaveRef,
}: UseCardViewWindowEventsOptions) {
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
      if (isGlobalEditing) {
        pendingCreateCardAfterSaveRef.current = true;
        requestSaveAndLockSelection();
        return;
      }
      void createAndFocusCard();
    };
    window.addEventListener("cardview:create-card-request", handler);
    return () => window.removeEventListener("cardview:create-card-request", handler);
  }, [
    createAndFocusCard,
    requestSaveAndLockSelection,
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
      finishSaveSelectionLock();
      const saved = Boolean(
        (event as CustomEvent<{ saved?: boolean }>)?.detail?.saved,
      );
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
