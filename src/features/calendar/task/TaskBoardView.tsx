import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, type WheelEvent } from "react";

import { TASK_COLUMNS } from "./task.types";
import type { Task, TaskStatus } from "./task.types";
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
};

type VerticalDropPosition = "before" | "after";

type VerticalRect = {
  top: number;
  height: number;
};

const DroppableTaskColumn = ({
  column,
  tasks,
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
    <div ref={setNodeRef} className="flex h-full min-h-0 min-w-0">
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
  const activeBottom = activeRect.top + activeRect.height;
  const overMiddleY = overRect.top + overRect.height / 2;

  if (activeRect.top < overRect.top) {
    return activeBottom >= overMiddleY ? "after" : "before";
  }

  return activeRect.top <= overMiddleY ? "before" : "after";
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

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
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div
        className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pt-4 pb-0"
        onWheelCapture={handleBoardWheel}
      >
        <div className="grid h-full min-h-0 min-w-full grid-flow-col auto-cols-[320px] gap-3">
          {TASK_COLUMNS.map((col) => (
            <DroppableTaskColumn
              key={col.id}
              column={col}
              tasks={tasksByStatus[col.id] ?? []}
              accountName={accountName}
              accountPhotoUrl={accountPhotoUrl}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onToggleTaskDone={onToggleTaskDone}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
};