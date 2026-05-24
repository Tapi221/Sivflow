export type InkHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
  strokeCount: number;
};

export interface InkLayerHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
}
