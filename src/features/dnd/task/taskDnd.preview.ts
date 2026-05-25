import type { Task } from "../../calendar/task/task.types";
import type { TaskDropTarget } from "./taskDnd.types";

export const findTask = (
  tasksByColumn: Record<string, Task[]>,
  taskId: string,
): Task | null => {
  for (const tasks of Object.values(tasksByColumn)) {
    const task = tasks.find((item) => item.id === taskId);

    if (task) {
      return task;
    }
  }

  return null;
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
    left.columnId === right.columnId &&
    left.overTaskId === right.overTaskId &&
    left.position === right.position &&
    left.insertIndex === right.insertIndex
  );
};

export const areTaskBoardsEqual = (
  left: Record<string, Task[]>,
  right: Record<string, Task[]>,
): boolean => {
  const columnIds = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const columnId of columnIds) {
    const leftTasks = left[columnId] ?? [];
    const rightTasks = right[columnId] ?? [];

    if (leftTasks.length !== rightTasks.length) {
      return false;
    }

    const isSameColumn = leftTasks.every((task, index) => {
      const rightTask = rightTasks[index];
      return (
        rightTask?.id === task.id &&
        rightTask.status === task.status &&
        rightTask.category === task.category
      );
    });

    if (!isSameColumn) {
      return false;
    }
  }

  return true;
};

export const createTaskDragPreview = (
  tasksByColumn: Record<string, Task[]>,
  activeTaskId: string,
  target: TaskDropTarget,
  getPreviewTask: (task: Task, targetColumnId: string) => Task = (task) => task,
): Record<string, Task[]> => {
  let activeTask: Task | null = null;
  let activeColumnId: string | null = null;
  const nextTasksByColumn: Record<string, Task[]> = { ...tasksByColumn };

  for (const [columnId, tasks] of Object.entries(tasksByColumn)) {
    const activeTaskIndex = tasks.findIndex((task) => task.id === activeTaskId);

    if (activeTaskIndex >= 0) {
      activeTask = tasks[activeTaskIndex];
      activeColumnId = columnId;
      nextTasksByColumn[columnId] = [
        ...tasks.slice(0, activeTaskIndex),
        ...tasks.slice(activeTaskIndex + 1),
      ];
      break;
    }
  }

  if (!activeTask || !activeColumnId) {
    return tasksByColumn;
  }

  const targetTasks = nextTasksByColumn[target.columnId] ?? [];
  let insertIndex = Math.max(
    0,
    Math.min(target.insertIndex ?? targetTasks.length, targetTasks.length),
  );

  if (target.insertIndex === undefined && target.overTaskId) {
    const overIndex = targetTasks.findIndex((task) => task.id === target.overTaskId);

    if (overIndex >= 0) {
      insertIndex = target.position === "after" ? overIndex + 1 : overIndex;
    }
  }

  const previewTask = getPreviewTask(activeTask, target.columnId);

  nextTasksByColumn[target.columnId] = [
    ...targetTasks.slice(0, insertIndex),
    previewTask,
    ...targetTasks.slice(insertIndex),
  ];

  return nextTasksByColumn;
};
