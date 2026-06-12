type InkHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
  strokeCount: number;
};
interface InkLayerHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export type { InkHistoryState, InkLayerHandle };
