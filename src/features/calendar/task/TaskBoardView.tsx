import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { useCallback, type CSSProperties, type WheelEvent } from "react";
import { createPortal } from "react-dom";

import { TASK_COLUMNS } from "./task.types";
import type { Task, TaskStatus } from "./task.types";
import { useTaskBoardDnd } from "./hooks/useTaskBoardDnd";
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
  activeTaskId?: string | null;
  enableSortableTransforms?: boolean;
  showDivider?: boolean;
};

const CALENDAR_PANEL_BACKGROUND_CLASS_NAME = "bg-white";
const TASK_CARD_OVERLAY_CLASS_NAME = "max-w-[calc(100vw-2rem)] will-change-transform";
const TASK_COLUMN_DIVIDER_CLASS_NAME = "border-l border-[#eeeeee]";

const DroppableTaskColumn = ({
  column,
  tasks,
  activeTaskId,
  enableSortableTransforms = false,
  showDivider = false,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
}: DroppableTaskColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      status: column.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex h-full min-h-0 min-w-0 transition-[background-color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
        showDivider ? TASK_COLUMN_DIVIDER_CLASS_NAME : ""
      } ${isOver ? "bg-[#fafafa]" : "bg-transparent"}`}
    >
      <TaskColumn
        column={column}
        tasks={tasks}
        activeTaskId={activeTaskId}
        enableSortableTransforms={enableSortableTransforms}
        accountName={accountName}
        accountPhotoUrl={accountPhotoUrl}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onToggleTaskDone={onToggleTaskDone}
      />
    </div>
  );
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
  const {
    activeTask,
    activeTaskId,
    activeTaskWidth,
    collisionDetection,
    dropAnimation,
    handleDragCancel,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    measuring,
    sensors,
    visibleTasksByStatus,
  } = useTaskBoardDnd({
    tasksByStatus,
    onReorderTask,
  });
  const isDragActive = activeTaskId !== null && activeTaskId !== undefined;

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

  const overlayStyle: CSSProperties | undefined = activeTaskWidth
    ? { width: activeTaskWidth }
    : undefined;

  const dragOverlay = (
    <DragOverlay adjustScale={false} dropAnimation={dropAnimation}>
      {activeTask ? (
        <div className={TASK_CARD_OVERLAY_CLASS_NAME} style={overlayStyle}>
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
      collisionDetection={collisionDetection}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pt-4 pb-0 ${CALENDAR_PANEL_BACKGROUND_CLASS_NAME}`}
        onWheelCapture={handleBoardWheel}
      >
        <div className="grid h-full min-h-0 w-full min-w-[960px] grid-cols-4 gap-0">
          {TASK_COLUMNS.map((col, index) => (
            <DroppableTaskColumn
              key={col.id}
              column={col}
              tasks={visibleTasksByStatus[col.id] ?? []}
              activeTaskId={activeTaskId}
              enableSortableTransforms={isDragActive}
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