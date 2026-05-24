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

export const useTaskBoardDnd = ({
  tasksByColumn,
  onReorderTask,
  getPreviewTask = defaultGetPreviewTask,
}: UseTaskBoardDndArgs) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskWidth, setActiveTaskWidth] = useState<number | null>(null);
  const [activeTaskHeight, setActiveTaskHeight] = useState<number | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<TaskDropTarget | null>(null);
  const latestDropTargetRef = useRef<TaskDropTarget | null>(null);
  const visibleTasksByColumn = useMemo(() => {
    if (!activeTaskId || !activeDropTarget) {
      return tasksByColumn;
    }

    return createTaskDragPreview(tasksByColumn, activeTaskId, activeDropTarget, getPreviewTask);
  }, [activeDropTarget, activeTaskId, getPreviewTask, tasksByColumn]);
  const isPreviewingTaskReorder = activeTaskId !== null && activeDropTarget !== null;
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
    setActiveTaskHeight(null);
    setActiveDropTarget(null);
    latestDropTargetRef.current = null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
    setActiveTaskWidth(event.active.rect.current.initial?.width ?? null);
    setActiveTaskHeight(event.active.rect.current.initial?.height ?? null);
    setActiveDropTarget(null);
    latestDropTargetRef.current = null;
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
        setActiveDropTarget(null);
      }
      return;
    }

    const previousTarget = latestDropTargetRef.current;
    if (areDropTargetsEqual(previousTarget, target)) {
      return;
    }

    latestDropTargetRef.current = target;
    setActiveDropTarget(target);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const latestDropTarget = latestDropTargetRef.current;
    const target = latestDropTarget ?? (
      event.over
        ? resolveDropTarget(
          event,
          tasksByColumn,
          activeId,
          latestDropTarget,
        )
        : null
    );

    resetDragState();

    if (!target) {
      return;
    }

    const activeTask = findTask(tasksByColumn, activeId);

    if (!activeTask) {
      return;
    }

    onReorderTask(activeId, target.columnId, target.overTaskId, target.position);
  };

  return {
    activeDropTarget,
    activeTask,
    activeTaskHeight,
    activeTaskId,
    activeTaskWidth,
    collisionDetection: taskBoardCollisionDetection,
    dropAnimation: TASK_DND_DROP_ANIMATION,
    handleDragCancel,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    isPreviewingTaskReorder,
    measuring: TASK_DND_MEASURING_CONFIG,
    sensors,
    visibleTasksByColumn,
  };
};