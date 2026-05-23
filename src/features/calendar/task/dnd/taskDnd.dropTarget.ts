import type { Task, TaskStatus } from "../task.types";
import { findTask, isTaskStatus } from "./taskDnd.preview";
import type {
  TaskDragEvent,
  TaskDropTarget,
  VerticalDropPosition,
  VerticalRect,
} from "./taskDnd.types";

const getActiveVerticalRect = (event: TaskDragEvent): VerticalRect => {
  const initialRect = event.active.rect.current.initial;
  const translatedRect = event.active.rect.current.translated;

  return {
    top: translatedRect?.top ?? initialRect.top + event.delta.y,
    height: translatedRect?.height ?? initialRect.height,
  };
};

const getPointerY = (event: TaskDragEvent): number | null => {
  const { activatorEvent } = event;

  if (
    "clientY" in activatorEvent &&
    typeof activatorEvent.clientY === "number"
  ) {
    return activatorEvent.clientY + event.delta.y;
  }

  return null;
};

const getDropPosition = (
  event: TaskDragEvent,
  overRect: VerticalRect,
): VerticalDropPosition => {
  const pointerY = getPointerY(event);
  const overMiddleY = overRect.top + overRect.height / 2;

  if (pointerY !== null) {
    return pointerY >= overMiddleY ? "after" : "before";
  }

  const activeRect = getActiveVerticalRect(event);
  const activeMiddleY = activeRect.top + activeRect.height / 2;

  return activeMiddleY >= overMiddleY ? "after" : "before";
};

export const resolveDropTarget = (
  event: TaskDragEvent,
  tasksByStatus: Record<TaskStatus, Task[]>,
  activeTaskId: string,
  fallbackTarget: TaskDropTarget | null = null,
): TaskDropTarget | null => {
  const over = event.over;

  if (!over) {
    return null;
  }

  const overType = over.data.current?.type;
  const overStatus = over.data.current?.status;

  if (overType === "column" && isTaskStatus(overStatus)) {
    return { status: overStatus };
  }

  const overTaskId = String(over.id);

  if (overTaskId === activeTaskId) {
    return fallbackTarget;
  }

  const overTask = findTask(tasksByStatus, overTaskId);

  if (!overTask) {
    return null;
  }

  return {
    status: overTask.status,
    overTaskId,
    position: getDropPosition(event, over.rect),
  };
};
