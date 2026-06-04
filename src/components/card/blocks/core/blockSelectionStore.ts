import { useSyncExternalStore } from "react";

type BlockSelectionListener = () => void;

let selectedBlockId: string | null = null;

const blockSelectionListeners = new Set<BlockSelectionListener>();

const emitBlockSelectionChange = () => {
  blockSelectionListeners.forEach((listener) => listener());
};

const getSelectedBlockIdSnapshot = () => selectedBlockId;

const subscribeSelectedBlockId = (listener: BlockSelectionListener) => {
  blockSelectionListeners.add(listener);
  return () => {
    blockSelectionListeners.delete(listener);
  };
};

export const setSelectedBlockId = (nextSelectedBlockId: string | null) => {
  if (selectedBlockId === nextSelectedBlockId) return;
  selectedBlockId = nextSelectedBlockId;
  emitBlockSelectionChange();
};

export const useSelectedBlockId = () =>
  useSyncExternalStore(
    subscribeSelectedBlockId,
    getSelectedBlockIdSnapshot,
    getSelectedBlockIdSnapshot,
  );
