import {
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMemo, useRef, useState } from "react";

import type { Task, TaskStatus } from "../../calendar/task/task.types";
import {
  TASK_DND_DROP_ANIMATION,
  TASK_DND_MEASURING_CONFIG,
  TASK_DND_POINTER_ACTIVATION_DISTANCE,
} from "./taskDnd.config";
import { taskBoardCollisionDetection } from "./taskDnd.collision";
import { resolveDropTarget } from "./taskDnd.dropTarget";
import {
  areDropTargetsEqual,
  areTaskBoardsEqual,
  createTaskDragPreview,
  findTask,
} from "./taskDnd.preview";
import type {
  TaskDropTarget,
  TaskInsertPosition,
} from "../dnd/taskDnd.types";

type UseTaskBoardDndArgs = {
  tasksByStatus: Record<TaskStatus, Task[]>;
  onReorderTask: (
    taskId: string,
    status: TaskStatus,
    overTaskId?: string | null,
    position?: TaskInsertPosition,
  ) => void;
};

export const useTaskBoardDnd = ({
  tasksByStatus,
  onReorderTask,
}: UseTaskBoardDndArgs) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskWidth, setActiveTaskWidth] = useState<number | null>(null);
  const [activeTaskHeight, setActiveTaskHeight] = useState<number | null>(null);
  const [previewTasksByStatus, setPreviewTasksByStatus] = useState<Record<
    TaskStatus,
    Task[]
  > | null>(null);
  const latestDropTargetRef = useRef<TaskDropTarget | null>(null);
  const visibleTasksByStatus = previewTasksByStatus ?? tasksByStatus;
  const isPreviewingTaskReorder = previewTasksByStatus !== null;
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

    return findTask(visibleTasksByStatus, activeTaskId);
  }, [activeTaskId, visibleTasksByStatus]);

  const updatePreview = (activeId: string, target: TaskDropTarget) => {
    const nextTasksByStatus = createTaskDragPreview(
      tasksByStatus,
      activeId,
      target,
    );

    setPreviewTasksByStatus(
      areTaskBoardsEqual(tasksByStatus, nextTasksByStatus)
        ? null
        : nextTasksByStatus,
    );
  };

  const resetDragState = () => {
    setActiveTaskId(null);
    setActiveTaskWidth(null);
    setActiveTaskHeight(null);
    setPreviewTasksByStatus(null);
    latestDropTargetRef.current = null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
    setActiveTaskWidth(event.active.rect.current.initial?.width ?? null);
    setActiveTaskHeight(event.active.rect.current.initial?.height ?? null);
    setPreviewTasksByStatus(null);
    latestDropTargetRef.current = null;
  };

  const handleDragCancel = () => {
    resetDragState();
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const target = resolveDropTarget(
      event,
      visibleTasksByStatus,
      activeId,
      latestDropTargetRef.current,
    );

    if (!target) {
      return;
    }

    const previousTarget = latestDropTargetRef.current;
    if (areDropTargetsEqual(previousTarget, target)) {
      return;
    }

    latestDropTargetRef.current = target;
    updatePreview(activeId, target);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const target = resolveDropTarget(
      event,
      visibleTasksByStatus,
      activeId,
      latestDropTargetRef.current,
    );

    resetDragState();

    if (!target) {
      return;
    }

    const activeTask = findTask(tasksByStatus, activeId);

    if (!activeTask) {
      return;
    }

    onReorderTask(activeId, target.status, target.overTaskId, target.position);
  };

  return {
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
    visibleTasksByStatus,
  };
};