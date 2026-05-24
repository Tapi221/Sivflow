import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { useCallback, useMemo, type CSSProperties, type WheelEvent } from "react";
import { createPortal } from "react-dom";

import { CATEGORY_CONFIG, TASK_COLUMNS } from "../task/task.types";
import type { Task, TaskGroupMode, TaskStatus } from "../task/task.types";
import { useTaskBoardDnd } from "../../dnd/task/useTaskBoardDnd";
import type { TaskDropTarget, TaskInsertPosition } from "../../dnd/task/taskDnd.types";
import { TaskCard } from "../task/TaskCard";
import { TaskColumn } from "../task/TaskColumn";

type TaskBoardViewProps = {
  tasks: Task[];
  tasksByStatus: Record<TaskStatus, Task[]>;
  groupMode: TaskGroupMode;
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
    destinationCategory?: string | null,
  ) => void;
};

type TaskBoardColumn = {
  id: string;
  label: string;
  dotColor: string;
};

type DroppableTaskColumnProps = Pick<
  TaskBoardViewProps,
  "accountName" | "accountPhotoUrl" | "onDeleteTask" | "onToggleTaskDone"
> & {
  column: TaskBoardColumn;
  tasks: Task[];
  activeDropTarget?: TaskDropTarget | null;
  activeTaskId?: string | null;
  showDivider?: boolean;
  onAddTask?: (columnId: string) => void;
  translateStatusLabel?: boolean;
};

type SectionGroup = {
  id: string;
  label: string;
  color: string;
  tasks: Task[];
};

const CALENDAR_PANEL_BACKGROUND_CLASS_NAME = "bg-white";
const TASK_CARD_OVERLAY_CLASS_NAME = "max-w-[calc(100vw-2rem)] will-change-transform";
const TASK_COLUMN_DIVIDER_CLASS_NAME = "border-l border-[#eeeeee]";

const getCategoryConfig = (category: string) => {
  return (
    CATEGORY_CONFIG[category] ?? {
      label: category,
      bg: "#f3f4f6",
      text: "#6b7280",
    }
  );
};

const DroppableTaskColumn = ({
  column,
  tasks,
  activeDropTarget,
  activeTaskId,
  showDivider = false,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
  translateStatusLabel = false,
}: DroppableTaskColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex h-full min-h-0 min-w-0 bg-transparent ${
        showDivider ? TASK_COLUMN_DIVIDER_CLASS_NAME : ""
      }`}
    >
      <TaskColumn
        column={column}
        tasks={tasks}
        activeDropTarget={activeDropTarget}
        activeTaskId={activeTaskId}
        accountName={accountName}
        accountPhotoUrl={accountPhotoUrl}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onToggleTaskDone={onToggleTaskDone}
        translateStatusLabel={translateStatusLabel}
      />
    </div>
  );
};

export const TaskBoardView = ({
  tasks,
  tasksByStatus,
  groupMode,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
  onReorderTask,
}: TaskBoardViewProps) => {
  const sectionGroups = useMemo<SectionGroup[]>(() => {
    const groups = new Map<string, SectionGroup>();

    tasks.forEach((task) => {
      const category = getCategoryConfig(task.category);
      const existing = groups.get(task.category);

      if (existing) {
        existing.tasks.push(task);
        return;
      }

      groups.set(task.category, {
        id: task.category,
        label: category.label,
        color: category.text,
        tasks: [task],
      });
    });

    return Array.from(groups.values());
  }, [tasks]);

  const tasksBySection = useMemo<Record<string, Task[]>>(() => {
    return Object.fromEntries(
      sectionGroups.map((group) => [group.id, group.tasks]),
    );
  }, [sectionGroups]);

  const tasksByDndColumn = groupMode === "section" ? tasksBySection : tasksByStatus;

  const handleDndReorderTask = useCallback((
    taskId: string,
    columnId: string,
    overTaskId?: string | null,
    position?: TaskInsertPosition,
  ) => {
    if (groupMode === "section") {
      const task = tasks.find((item) => item.id === taskId);

      if (task) {
        onReorderTask(taskId, task.status, overTaskId, position, columnId);
      }
      return;
    }

    onReorderTask(taskId, columnId as TaskStatus, overTaskId, position);
  }, [groupMode, onReorderTask, tasks]);

  const getPreviewTask = useCallback((task: Task, targetColumnId: string) => {
    if (groupMode === "section") {
      return {
        ...task,
        category: targetColumnId,
      };
    }

    return {
      ...task,
      status: targetColumnId as TaskStatus,
    };
  }, [groupMode]);

  const {
    activeDropTarget,
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
    visibleTasksByColumn,
  } = useTaskBoardDnd({
    tasksByColumn: tasksByDndColumn,
    onReorderTask: handleDndReorderTask,
    getPreviewTask,
  });

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

  const boardContent = groupMode === "section" ? (
    <div
      className={`min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pt-4 pb-0 ${CALENDAR_PANEL_BACKGROUND_CLASS_NAME}`}
      onWheelCapture={handleBoardWheel}
    >
      <div
        className="grid h-full min-h-0 w-full min-w-[960px] gap-0"
        style={{
          gridTemplateColumns: `repeat(${Math.max(sectionGroups.length, 1)}, minmax(240px, 25%))`,
        }}
      >
        {sectionGroups.length === 0 ? (
          <DroppableTaskColumn
            column={{ id: "empty", label: "セクション", dotColor: "#8f929c" }}
            tasks={[]}
            activeDropTarget={activeDropTarget}
            activeTaskId={activeTaskId}
            accountName={accountName}
            accountPhotoUrl={accountPhotoUrl}
            onDeleteTask={onDeleteTask}
            onToggleTaskDone={onToggleTaskDone}
          />
        ) : (
          sectionGroups.map((group, index) => (
            <DroppableTaskColumn
              key={group.id}
              column={{ id: group.id, label: group.label, dotColor: group.color }}
              tasks={visibleTasksByColumn[group.id] ?? group.tasks}
              activeDropTarget={activeDropTarget}
              activeTaskId={activeTaskId}
              showDivider={index > 0}
              accountName={accountName}
              accountPhotoUrl={accountPhotoUrl}
              onDeleteTask={onDeleteTask}
              onToggleTaskDone={onToggleTaskDone}
            />
          ))
        )}
      </div>
    </div>
  ) : (
    <div
      className={`min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pt-4 pb-0 ${CALENDAR_PANEL_BACKGROUND_CLASS_NAME}`}
      onWheelCapture={handleBoardWheel}
    >
      <div className="grid h-full min-h-0 w-full min-w-[960px] grid-cols-4 gap-0">
        {TASK_COLUMNS.map((col, index) => (
          <DroppableTaskColumn
            key={col.id}
            column={{ id: col.id, label: col.label, dotColor: col.dotColor }}
            tasks={visibleTasksByColumn[col.id] ?? []}
            activeDropTarget={activeDropTarget}
            activeTaskId={activeTaskId}
            showDivider={index > 0}
            accountName={accountName}
            accountPhotoUrl={accountPhotoUrl}
            onAddTask={onAddTask}
            onDeleteTask={onDeleteTask}
            onToggleTaskDone={onToggleTaskDone}
            translateStatusLabel
          />
        ))}
      </div>
    </div>
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
      {boardContent}

      {typeof document === "undefined"
        ? dragOverlay
        : createPortal(dragOverlay, document.body)}
    </DndContext>
  );
};