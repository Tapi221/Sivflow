import { useEffect } from "react";
import { CARDVIEW_SAVE_FINISHED_EVENT } from "../constants";

interface UseCardViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  createAndFocusCard: () => Promise<boolean>;
  isGlobalEditing: boolean;
  setIsGlobalEditing: (value: boolean) => void;
  setSaveSignal: React.Dispatch<React.SetStateAction<number>>;
  pendingExitAfterSaveRef: React.MutableRefObject<boolean>;
  pendingCreateCardAfterSaveRef: React.MutableRefObject<boolean>;
}

export function useCardViewWindowEvents({
  handleToggleViewMode,
  createAndFocusCard,
  isGlobalEditing,
  setIsGlobalEditing,
  setSaveSignal,
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
        setSaveSignal((prev) => prev + 1);
        return;
      }
      void createAndFocusCard();
    };
    window.addEventListener("cardview:create-card-request", handler);
    return () => window.removeEventListener("cardview:create-card-request", handler);
  }, [
    createAndFocusCard,
    isGlobalEditing,
    pendingCreateCardAfterSaveRef,
    pendingExitAfterSaveRef,
    setSaveSignal,
  ]);

  useEffect(() => {
    const handler = () => {
      if (isGlobalEditing) pendingExitAfterSaveRef.current = true;
      setSaveSignal((prev) => prev + 1);
    };
    window.addEventListener("cardview:save-request", handler);
    return () => window.removeEventListener("cardview:save-request", handler);
  }, [isGlobalEditing, pendingExitAfterSaveRef, setSaveSignal]);

  useEffect(() => {
    const handler = (event: Event) => {
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
    pendingCreateCardAfterSaveRef,
    pendingExitAfterSaveRef,
    setIsGlobalEditing,
  ]);
}
