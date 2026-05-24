import type { Task } from "../../calendar/task/task.types";
import type { TaskDragEvent, TaskDropTarget } from "./taskDnd.types";

const toColumnId = (value: unknown): string | null => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getColumnId = (data: Record<string, unknown> | undefined): string | null => {
  return toColumnId(data?.columnId ?? data?.status);
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

  if (overType === "column" && overColumnId) {
    return { columnId: overColumnId };
  }

  if (overType === "task-slot" && overColumnId) {
    const insertIndex = over.data.current?.insertIndex;
    const overTaskId = over.data.current?.overTaskId;

    return {
      columnId: overColumnId,
      overTaskId: typeof overTaskId === "string" ? overTaskId : null,
      position: "before",
      insertIndex: typeof insertIndex === "number" ? insertIndex : undefined,
    };
  }

  if (String(over.id) === activeTaskId) {
    return fallbackTarget;
  }

  return fallbackTarget;
};
