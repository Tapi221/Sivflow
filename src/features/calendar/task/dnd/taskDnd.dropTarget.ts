import type { Task, TaskStatus } from "../task.types";
import { isTaskStatus } from "./taskDnd.preview";
import type { TaskDragEvent, TaskDropTarget } from "./taskDnd.types";

export const resolveDropTarget = (
  event: TaskDragEvent,
  _tasksByStatus: Record<TaskStatus, Task[]>,
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

  if (overType === "task-slot" && isTaskStatus(overStatus)) {
    const insertIndex = over.data.current?.insertIndex;
    const overTaskId = over.data.current?.overTaskId;

    return {
      status: overStatus,
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
