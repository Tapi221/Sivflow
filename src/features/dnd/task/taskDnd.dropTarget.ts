import type { Task, TaskDragEvent, TaskDropTarget, VerticalDropPosition } from "./taskDnd.types";

const toColumnId = (value: unknown): string | null => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getColumnId = (data: Record<string, unknown> | undefined): string | null => {
  return toColumnId(data?.columnId ?? data?.status);
};

const getTaskDropPosition = (event: TaskDragEvent): VerticalDropPosition => {
  const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
  const overRect = event.over?.rect;

  if (!activeRect || !overRect) {
    return "before";
  }

  const activeCenterY = activeRect.top + activeRect.height / 2;
  const overCenterY = overRect.top + overRect.height / 2;

  return activeCenterY > overCenterY ? "after" : "before";
};

const getSlotDropPosition = (
  data: Record<string, unknown> | undefined,
): VerticalDropPosition => {
  return data?.position === "after" ? "after" : "before";
};

export const resolveDropTarget = (
  event: TaskDragEvent,
  _tasksByColumn: Record<string, Task[]>,
  activeTaskId: string,
  fallbackTarget: TaskDropTarget | null = null,
): TaskDropTarget | null => {
  const over = event.over;

  if (!over) {
    return null;
  }

  const overType = over.data.current?.type;
  const overColumnId = getColumnId(over.data.current);

  if (String(over.id) === activeTaskId) {
    return fallbackTarget;
  }

  if (overType === "column" && overColumnId) {
    return { columnId: overColumnId };
  }

  if (overType === "task-slot" && overColumnId) {
    const insertIndex = over.data.current?.insertIndex;
    const overTaskId = over.data.current?.overTaskId;

    return {
      columnId: overColumnId,
      overTaskId: typeof overTaskId === "string" ? overTaskId : null,
      position: getSlotDropPosition(over.data.current),
      insertIndex: typeof insertIndex === "number" ? insertIndex : undefined,
    };
  }

  if (overType === "task" && overColumnId) {
    return {
      columnId: overColumnId,
      overTaskId: String(over.id),
      position: getTaskDropPosition(event),
    };
  }

  return fallbackTarget;
};