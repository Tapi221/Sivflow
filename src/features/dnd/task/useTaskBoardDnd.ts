import { type DragEndEvent, type DragOverEvent, type DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMemo, useRef, useState } from "react";
import type { Task } from "../../calendar/task/task.types";
import { TASK_DND_DROP_ANIMATION, TASK_DND_MEASURING_CONFIG, TASK_DND_POINTER_ACTIVATION_DISTANCE } from "./taskDnd.config";
import { taskBoardCollisionDetection } from "./taskDnd.collision";
import { resolveDropTarget } from "./taskDnd.dropTarget";
import { areDropTargetsEqual, createTaskDragPreview, findTask } from "./taskDnd.preview";
import type { TaskDropTarget, TaskInsertPosition } from "./taskDnd.types";

type UseTaskBoardDndArgs = {
  tasksByColumn: Record<string, Task[]>;
  onReorderTask: (
    taskId: string,
    columnId: string,
    overTaskId?: string | null,
    position?: TaskInsertPosition,
  ) => void;
  getPreviewTask?: (task: Task, targetColumnId: string) => Task;
};

const defaultGetPreviewTask = (task: Task) => task;
const TASK_DND_ADJACENT_SLOT_SWITCH_THRESHOLD_PX = 12;

const shouldKeepPreviousAdjacentSlot = (
  previousTarget: TaskDropTarget | null,
  nextTarget: TaskDropTarget,
  previousDeltaY: number | null,
  nextDeltaY: number,
) => {
  if (
    !previousTarget ||
    previousDeltaY === null ||
    previousTarget.columnId !== nextTarget.columnId ||
    typeof previousTarget.insertIndex !== "number" ||
    typeof nextTarget.insertIndex !== "number"
  ) {
    return false;
  }

  const isAdjacentSlot =
    Math.abs(previousTarget.insertIndex - nextTarget.insertIndex) === 1;

  if (!isAdjacentSlot) {
    return false;
  }

  return (
    Math.abs(nextDeltaY - previousDeltaY) <
    TASK_DND_ADJACENT_SLOT_SWITCH_THRESHOLD_PX
  );
};

const resolveIndexedDropTarget = (
  target: TaskDropTarget,
  tasksByColumn: Record<string, Task[]>,
  activeTaskId: string,
): TaskDropTarget => {
  if (typeof target.insertIndex !== "number") {
    return target;
  }

  const targetTasks = (tasksByColumn[target.columnId] ?? []).filter(
    (task) => task.id !== activeTaskId,
  );
  const insertIndex = Math.max(
    0,
    Math.min(target.insertIndex, targetTasks.length),
  );
  const previousTask = targetTasks[insertIndex - 1];

  if (previousTask) {
    return {
      ...target,
      insertIndex,
      overTaskId: previousTask.id,
      position: "after",
    };
  }

  const nextTask = targetTasks[insertIndex];

  if (nextTask) {
    return {
      ...target,
      insertIndex,
      overTaskId: nextTask.id,
      position: "before",
    };
  }

  return {
    ...target,
    insertIndex,
    overTaskId: null,
    position: "before",
  };
};

export const useTaskBoardDnd = ({
  tasksByColumn,
  onReorderTask,
  getPreviewTask = defaultGetPreviewTask,
}: UseTaskBoardDndArgs) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskWidth, setActiveTaskWidth] = useState<number | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<TaskDropTarget | null>(null);
  const latestDropTargetRef = useRef<TaskDropTarget | null>(null);
  const latestDropTargetDeltaYRef = useRef<number | null>(null);
  const visibleTasksByColumn = useMemo(() => {
    if (!activeTaskId || !activeDropTarget) {
      return tasksByColumn;
    }

    return createTaskDragPreview(tasksByColumn, activeTaskId, activeDropTarget, getPreviewTask);
  }, [activeDropTarget, activeTaskId, getPreviewTask, tasksByColumn]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: TASK_DND_POINTER_ACTIVATION_DISTANCE,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeTask = useMemo(() => {
    if (!activeTaskId) {
      return null;
    }

    return findTask(tasksByColumn, activeTaskId);
  }, [activeTaskId, tasksByColumn]);

  const resetDragState = () => {
    setActiveTaskId(null);
    setActiveTaskWidth(null);
    setActiveDropTarget(null);
    latestDropTargetRef.current = null;
    latestDropTargetDeltaYRef.current = null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
    setActiveTaskWidth(event.active.rect.current.initial?.width ?? null);
    setActiveDropTarget(null);
    latestDropTargetRef.current = null;
    latestDropTargetDeltaYRef.current = 0;
  };

  const handleDragCancel = () => {
    resetDragState();
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const target = resolveDropTarget(
      event,
      tasksByColumn,
      activeId,
      latestDropTargetRef.current,
    );

    if (!target) {
      if (latestDropTargetRef.current !== null) {
        latestDropTargetRef.current = null;
        latestDropTargetDeltaYRef.current = event.delta.y;
        setActiveDropTarget(null);
      }
      return;
    }

    const previousTarget = latestDropTargetRef.current;
    if (areDropTargetsEqual(previousTarget, target)) {
      return;
    }

    if (
      shouldKeepPreviousAdjacentSlot(
        previousTarget,
        target,
        latestDropTargetDeltaYRef.current,
        event.delta.y,
      )
    ) {
      return;
    }

    latestDropTargetRef.current = target;
    latestDropTargetDeltaYRef.current = event.delta.y;
    setActiveDropTarget(target);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const latestDropTarget = latestDropTargetRef.current;
    const rawTarget = latestDropTarget ?? (
      event.over
        ? resolveDropTarget(
          event,
          tasksByColumn,
          activeId,
          latestDropTarget,
        )
        : null
    );
    const target = rawTarget
      ? resolveIndexedDropTarget(rawTarget, tasksByColumn, activeId)
      : null;

    resetDragState();

    if (!target) {
      console.warn("Task DND drop ignored: no drop target was resolved.", {
        activeId,
        overId: event.over ? String(event.over.id) : null,
        overType: event.over?.data.current?.type ?? null,
      });
      return;
    }

    const activeTask = findTask(tasksByColumn, activeId);

    if (!activeTask) {
      console.warn("Task DND drop ignored: active task was not found in tasksByColumn.", {
        activeId,
        columnIds: Object.keys(tasksByColumn),
        target,
      });
      return;
    }

    console.info("Task DND drop resolved.", {
      activeId,
      activeTaskCategory: activeTask.category,
      activeTaskStatus: activeTask.status,
      target,
    });
    onReorderTask(activeId, target.columnId, target.overTaskId, target.position);
  };

  return {
    activeDropTarget,
    activeTask,
    activeTaskId,
    activeTaskWidth,
    collisionDetection: taskBoardCollisionDetection,
    dropAnimation: TASK_DND_DROP_ANIMATION,
    handleDragCancel,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    measuring: TASK_DND_MEASURING_CONFIG,
    sensors,
    visibleTasksByColumn,
  };
};
