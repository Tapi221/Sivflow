import {
  closestCorners,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useMemo, useState, type WheelEvent } from "react";

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

type VerticalDropPosition = "before" | "after";

type VerticalRect = {
  top: number;
  height: number;
};

const CALENDAR_PANEL_BACKGROUND_CLASS_NAME = "bg-[#f7f8fa]";
const TASK_CARD_OVERLAY_CLASS_NAME = "w-[236px] max-w-[calc(100vw-2rem)]";
const TASK_COLUMN_DIVIDER_CLASS_NAME =
  "before:pointer-events-none before:absolute before:-left-1.5 before:top-0 before:bottom-0 before:w-px before:bg-[#e3e5ea] before:content-['']";

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
      return closestCorners({
        ...args,
        droppableContainers: targetColumnTasks,
      });
    }

    return columnCollisions;
  }

  const taskCollisions = closestCorners({
    ...args,
    droppableContainers: taskContainers,
  });

  return taskCollisions.length > 0 ? taskCollisions : closestCorners(args);
};

const getActiveVerticalRect = (event: DragEndEvent): VerticalRect => {
  const initialRect = event.active.rect.current.initial;
  const translatedRect = event.active.rect.current.translated;

  return {
    top: translatedRect?.top ?? initialRect.top + event.delta.y,
    height: translatedRect?.height ?? initialRect.height,
  };
};

const getDropPosition = (
  event: DragEndEvent,
  overRect: VerticalRect,
): VerticalDropPosition => {
  const activeRect = getActiveVerticalRect(event);
  const activeMiddleY = activeRect.top + activeRect.height / 2;
  const overMiddleY = overRect.top + overRect.height / 2;

  return activeMiddleY >= overMiddleY ? "after" : "before";
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

    return findTask(tasksByStatus, activeTaskId);
  }, [activeTaskId, tasksByStatus]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
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
    setActiveTaskId(null);

    const activeId = String(event.active.id);
    const over = event.over;

    if (!over) {
      return;
    }

    const activeTask = findTask(tasksByStatus, activeId);

    if (!activeTask) {
      return;
    }

    const overType = over.data.current?.type;
    const overStatus = over.data.current?.status;

    if (overType === "column" && isTaskStatus(overStatus)) {
      onReorderTask(activeId, overStatus);
      return;
    }

    const overId = String(over.id);
    const overTask = findTask(tasksByStatus, overId);

    if (!overTask || overId === activeId) {
      return;
    }

    const position = getDropPosition(event, over.rect);

    onReorderTask(activeId, overTask.status, overId, position);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={taskBoardCollisionDetection}
      onDragStart={handleDragStart}
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
              tasks={tasksByStatus[col.id] ?? []}
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

      <DragOverlay adjustScale={false} dropAnimation={null}>
        {activeTask ? (
          <div className={TASK_CARD_OVERLAY_CLASS_NAME}>
            <TaskCard
              task={activeTask}
              accountName={accountName}
              accountPhotoUrl={accountPhotoUrl}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};