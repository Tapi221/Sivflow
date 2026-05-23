import { TASK_COLUMNS } from "../task.types";
import type { Task, TaskStatus } from "../task.types";
import type { TaskDropTarget } from "./taskDnd.types";

export const findTask = (
  tasksByStatus: Record<TaskStatus, Task[]>,
  taskId: string,
): Task | null => {
  for (const column of TASK_COLUMNS) {
    const task = tasksByStatus[column.id]?.find((item) => item.id === taskId);

    if (task) {
      return task;
    }
  }

  return null;
};

export const isTaskStatus = (value: unknown): value is TaskStatus => {
  return TASK_COLUMNS.some((column) => column.id === value);
};

export const areDropTargetsEqual = (
  left: TaskDropTarget | null,
  right: TaskDropTarget | null,
): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.status === right.status &&
    left.overTaskId === right.overTaskId &&
    left.position === right.position
  );
};

export const areTaskBoardsEqual = (
  left: Record<TaskStatus, Task[]>,
  right: Record<TaskStatus, Task[]>,
): boolean => {
  return TASK_COLUMNS.every((column) => {
    const leftTasks = left[column.id] ?? [];
    const rightTasks = right[column.id] ?? [];

    if (leftTasks.length !== rightTasks.length) {
      return false;
    }

    return leftTasks.every((task, index) => {
      const rightTask = rightTasks[index];
      return rightTask?.id === task.id && rightTask.status === task.status;
    });
  });
};

export const createTaskDragPreview = (
  tasksByStatus: Record<TaskStatus, Task[]>,
  activeTaskId: string,
  target: TaskDropTarget,
): Record<TaskStatus, Task[]> => {
  const activeTask = findTask(tasksByStatus, activeTaskId);

  if (!activeTask) {
    return tasksByStatus;
  }

  const nextTasksByStatus = TASK_COLUMNS.reduce(
    (acc, column) => {
      acc[column.id] = (tasksByStatus[column.id] ?? []).filter(
        (task) => task.id !== activeTaskId,
      );
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );
  const targetTasks = nextTasksByStatus[target.status] ?? [];
  let insertIndex = targetTasks.length;

  if (target.overTaskId) {
    const overIndex = targetTasks.findIndex((task) => task.id === target.overTaskId);

    if (overIndex >= 0) {
      insertIndex = target.position === "after" ? overIndex + 1 : overIndex;
    }
  }

  const previewTask =
    activeTask.status === target.status
      ? activeTask
      : { ...activeTask, status: target.status };

  nextTasksByStatus[target.status] = [
    ...targetTasks.slice(0, insertIndex),
    previewTask,
    ...targetTasks.slice(insertIndex),
  ];

  return nextTasksByStatus;
};
