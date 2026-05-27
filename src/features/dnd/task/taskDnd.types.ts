import type { CollisionDetection, DragEndEvent, DragOverEvent } from "@dnd-kit/core";

export type TaskInsertPosition = "before" | "after";
export type VerticalDropPosition = "before" | "after";

export type Task = {
  id: string;
  status: string;
  category: string;
  [key: string]: unknown;
};

export type CollisionDetectionArgs = Parameters<CollisionDetection>[0];
export type CollisionDescriptor = ReturnType<CollisionDetection>[number];

export type VerticalRect = {
  top: number;
  height: number;
};

export type TaskDragEvent = DragEndEvent | DragOverEvent;

export type TaskDropTarget = {
  columnId: string;
  overTaskId?: string | null;
  position?: VerticalDropPosition;
  insertIndex?: number;
};