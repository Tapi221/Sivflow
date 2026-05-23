import {
  closestCorners,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragOverEvent,
  type DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useMemo, useRef, useState, type WheelEvent } from "react";
import { createPortal } from "react-dom";

import { TASK_COLUMNS } from "./task.types";
import type { Task, TaskStatus } from "./task.types";
import { TaskCard } from "./TaskCard";
import { TaskColumn } from "./TaskColumn";

type TaskBoardViewProps = {
  tasksByStatus: Record<TaskStatus, Task[]>;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onAddTask: (status: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskDone: (taskId: string, done: boolean) => void;
  onReorderTask: (
    taskId: string,
    status: TaskStatus,
    overTaskId?: string | null,
    position?: "before" | "after",
  ) => void;
};

type DroppableTaskColumnProps = Omit<TaskBoardViewProps, "tasksByStatus" | "onReorderTask"> & {
  column: (typeof TASK_COLUMNS)[number];
  tasks: Task[];
  showDivider?: boolean;
};

type CollisionDetectionArgs = Parameters<CollisionDetection>[0];
type CollisionDescriptor = ReturnType<CollisionDetection>[number];
type VerticalDropPosition = "before" | "after";

type VerticalRect = {
  top: number;
  height: number;
};

type TaskDragEvent = DragEndEvent | DragOverEvent;

type TaskDropTarget = {
  status: TaskStatus;
  overTaskId?: string | null;
  position?: VerticalDropPosition;
};

const CALENDAR_PANEL_BACKGROUND_CLASS_NAME = "bg-white";
const TASK_CARD_OVERLAY_CLASS_NAME = "max-w-[calc(100vw-2rem)]";
const TASK_COLUMN_DIVIDER_CLASS_NAME =
  "before:pointer-events-none before:absolute before:-left-1.5 before:top-0 before:bottom-0 before:w-[0.5px] before:bg-[#eeeeee] before:content-['']";
const TASK_DND_MEASURING_CONFIG = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

const DroppableTaskColumn = ({
  column,
  tasks,
  showDivider = false,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
}: DroppableTaskColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      status: column.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex h-full min-h-0 min-w-0 ${
        showDivider ? TASK_COLUMN_DIVIDER_CLASS_NAME : ""
      }`}
    >
      <TaskColumn
        column={column}
        tasks={tasks}
        accountName={accountName}
        accountPhotoUrl={accountPhotoUrl}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onToggleTaskDone={onToggleTaskDone}
      />
    </div>
  );
};

const findTask = (
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

const isTaskStatus = (value: unknown): value is TaskStatus => {
  return TASK_COLUMNS.some((column) => column.id === value);
};

const areDropTargetsEqual = (
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

const areTaskBoardsEqual = (
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

const createTaskDragPreview = (
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

const getPointerTaskCollisions = (
  args: CollisionDetectionArgs,
  taskContainers: CollisionDetectionArgs["droppableContainers"],
): CollisionDescriptor[] => {
  const { pointerCoordinates } = args;

  if (!pointerCoordinates) {
    return closestCorners({
      ...args,
      droppableContainers: taskContainers,
    });
  }

  return taskContainers
    .map((container): CollisionDescriptor | null => {
      const rect = args.droppableRects.get(container.id);

      if (!rect) {
        return null;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const outsideTop = Math.max(0, rect.top - pointerCoordinates.y);
      const outsideBottom = Math.max(
        0,
        pointerCoordinates.y - (rect.top + rect.height),
      );
      const verticalDistance = Math.abs(pointerCoordinates.y - centerY);
      const horizontalDistance = Math.abs(pointerCoordinates.x - centerX);
      const value =
        (outsideTop + outsideBottom) * 4 + verticalDistance + horizontalDistance * 0.01;

      return {
        id: container.id,
        data: {
          droppableContainer: container,
          value,
        },
      };
    })
    .filter((collision): collision is CollisionDescriptor => collision !== null)
    .sort((left, right) => left.data.value - right.data.value);
};

const taskBoardCollisionDetection: CollisionDetection = (args) => {
  const activeId = args.active.id;
  const columnContainers = args.droppableContainers.filter(
    (container) => container.data.current?.type === "column",
  );
  const taskContainers = args.droppableContainers.filter(
    (container) =>
      container.id !== activeId && container.data.current?.type === "task",
  );

  const pointerColumnCollisions = pointerWithin({
    ...args,
    droppableContainers: columnContainers,
  });
  const columnCollisions =
    pointerColumnCollisions.length > 0
      ? pointerColumnCollisions
      : rectIntersection({
        ...args,
        droppableContainers: columnContainers,
      });

  const overColumn = columnContainers.find(
    (container) => container.id === columnCollisions[0]?.id,
  );
  const overStatus = overColumn?.data.current?.status;

  if (isTaskStatus(overStatus)) {
    const targetColumnTasks = taskContainers.filter(
      (container) => container.data.current?.status === overStatus,
    );

    if (targetColumnTasks.length > 0) {
      return getPointerTaskCollisions(args, targetColumnTasks);
    }

    return columnCollisions;
  }

  const taskCollisions = getPointerTaskCollisions(args, taskContainers);

  return taskCollisions.length > 0 ? taskCollisions : closestCorners(args);
};

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

const resolveDropTarget = (
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

export const TaskBoardView = ({
  tasksByStatus,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
  onReorderTask,
}: TaskBoardViewProps) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskWidth, setActiveTaskWidth] = useState<number | null>(null);
  const [previewTasksByStatus, setPreviewTasksByStatus] = useState<Record<
    TaskStatus,
    Task[]
  > | null>(null);
  const latestDropTargetRef = useRef<TaskDropTarget | null>(null);
  const visibleTasksByStatus = previewTasksByStatus ?? tasksByStatus;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const activeTask = useMemo(() => {
    if (!activeTaskId) {
      return null;
    }

    return findTask(visibleTasksByStatus, activeTaskId);
  }, [activeTaskId, visibleTasksByStatus]);

  const resetDragState = () => {
    setActiveTaskId(null);
    setActiveTaskWidth(null);
    setPreviewTasksByStatus(null);
    latestDropTargetRef.current = null;
  };

  const handleDragStart = (event: DragStartEvent) => {
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

    setPreviewTasksByStatus((currentTasksByStatus) => {
      const baseTasksByStatus = currentTasksByStatus ?? tasksByStatus;
      const nextTasksByStatus = createTaskDragPreview(
        baseTasksByStatus,
        activeId,
        target,
      );

      if (areTaskBoardsEqual(baseTasksByStatus, nextTasksByStatus)) {
        return currentTasksByStatus;
      }

      return nextTasksByStatus;
    });
  };

  const handleBoardWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const horizontalDelta = event.shiftKey ? event.deltaY : event.deltaX;

    if (horizontalDelta === 0) {
      return;
    }

    if (!event.shiftKey && Math.abs(horizontalDelta) <= Math.abs(event.deltaY)) {
      return;
    }

    const container = event.currentTarget;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    if (maxScrollLeft <= 0) {
      return;
    }

    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, container.scrollLeft + horizontalDelta),
    );

    if (nextScrollLeft === container.scrollLeft) {
      return;
    }

    event.preventDefault();
    container.scrollLeft = nextScrollLeft;
  }, []);

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

  const dragOverlay = (
    <DragOverlay adjustScale={false} dropAnimation={null}>
      {activeTask ? (
        <div
          className={TASK_CARD_OVERLAY_CLASS_NAME}
          style={activeTaskWidth ? { width: activeTaskWidth } : undefined}
        >
          <TaskCard
            task={activeTask}
            accountName={accountName}
            accountPhotoUrl={accountPhotoUrl}
            isDragging
          />
        </div>
      ) : null}
    </DragOverlay>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={taskBoardCollisionDetection}
      measuring={TASK_DND_MEASURING_CONFIG}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pt-4 pb-0 ${CALENDAR_PANEL_BACKGROUND_CLASS_NAME}`}
        onWheelCapture={handleBoardWheel}
      >
        <div className="grid h-full min-h-0 min-w-full grid-flow-col auto-cols-[260px] gap-3">
          {TASK_COLUMNS.map((col, index) => (
            <DroppableTaskColumn
              key={col.id}
              column={col}
              tasks={visibleTasksByStatus[col.id] ?? []}
              showDivider={index > 0}
              accountName={accountName}
              accountPhotoUrl={accountPhotoUrl}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onToggleTaskDone={onToggleTaskDone}
            />
          ))}
        </div>
      </div>

      {typeof document === "undefined"
        ? dragOverlay
        : createPortal(dragOverlay, document.body)}
    </DndContext>
  );
};