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
import { useEffect, useMemo, useRef, useState } from "react";

import type { Task, TaskStatus } from "../task.types";
import {
  TASK_DND_DROP_ANIMATION,
  TASK_DND_MEASURING_CONFIG,
  TASK_DND_POINTER_ACTIVATION_DISTANCE,
} from "../dnd/taskDnd.config";
import { taskBoardCollisionDetection } from "../dnd/taskDnd.collision";
import { resolveDropTarget } from "../dnd/taskDnd.dropTarget";
import {
  areDropTargetsEqual,
  areTaskBoardsEqual,
  createTaskDragPreview,
  findTask,
} from "../dnd/taskDnd.preview";
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
  const [previewTasksByStatus, setPreviewTasksByStatus] = useState<Record<
    TaskStatus,
    Task[]
  > | null>(null);
  const latestDropTargetRef = useRef<TaskDropTarget | null>(null);
  const previewFrameRef = useRef<number | null>(null);
  const pendingPreviewRef = useRef<{
    activeId: string;
    target: TaskDropTarget;
  } | null>(null);
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

  const flushPreviewUpdate = () => {
    previewFrameRef.current = null;
    const pendingPreview = pendingPreviewRef.current;
    pendingPreviewRef.current = null;

    if (!pendingPreview) {
      return;
    }

    setPreviewTasksByStatus((currentTasksByStatus) => {
      const baseTasksByStatus = currentTasksByStatus ?? tasksByStatus;
      const nextTasksByStatus = createTaskDragPreview(
        baseTasksByStatus,
        pendingPreview.activeId,
        pendingPreview.target,
      );

      if (areTaskBoardsEqual(baseTasksByStatus, nextTasksByStatus)) {
        return currentTasksByStatus;
      }

      return nextTasksByStatus;
    });
  };

  const schedulePreviewUpdate = (activeId: string, target: TaskDropTarget) => {
    pendingPreviewRef.current = { activeId, target };

    if (previewFrameRef.current !== null) {
      return;
    }

    previewFrameRef.current = window.requestAnimationFrame(flushPreviewUpdate);
  };

  const cancelPendingPreviewUpdate = () => {
    if (previewFrameRef.current !== null) {
      window.cancelAnimationFrame(previewFrameRef.current);
      previewFrameRef.current = null;
    }

    pendingPreviewRef.current = null;
  };

  const resetDragState = () => {
    cancelPendingPreviewUpdate();
    setActiveTaskId(null);
    setActiveTaskWidth(null);
    setPreviewTasksByStatus(null);
    latestDropTargetRef.current = null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    cancelPendingPreviewUpdate();
    setActiveTaskId(String(event.active.id));
    setActiveTaskWidth(event.active.rect.current.initial?.width ?? null);
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
    schedulePreviewUpdate(activeId, target);
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

  useEffect(() => {
    return () => {
      cancelPendingPreviewUpdate();
    };
  }, []);

  return {
    activeTask,
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