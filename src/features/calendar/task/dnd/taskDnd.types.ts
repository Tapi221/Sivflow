import type {
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";

import type { TaskStatus } from "../task.types";

export type TaskInsertPosition = "before" | "after";
export type VerticalDropPosition = "before" | "after";

export type CollisionDetectionArgs = Parameters<CollisionDetection>[0];
export type CollisionDescriptor = ReturnType<CollisionDetection>[number];

export type VerticalRect = {
  top: number;
  height: number;
};

export type TaskDragEvent = DragEndEvent | DragOverEvent;

export type TaskDropTarget = {
  status: TaskStatus;
  overTaskId?: string | null;
  position?: VerticalDropPosition;
};
