import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { useCallback, useMemo, type CSSProperties, type WheelEvent } from "react";
import { createPortal } from "react-dom";

import { CATEGORY_CONFIG, TASK_COLUMNS } from "../task/task.types";
import type { Task, TaskGroupMode, TaskStatus } from "../task/task.types";
import { useTaskBoardDnd } from "../../dnd/task/useTaskBoardDnd";
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
  ) => void;
};

type DroppableTaskColumnProps = Omit<TaskBoardViewProps, "tasks" | "tasksByStatus" | "groupMode" | "onReorderTask"> & {
  column: (typeof TASK_COLUMNS)[number];
  tasks: Task[];
  activeTaskId?: string | null;
  showDivider?: boolean;
};

type SectionGroup = {
  id: string;
  label: string;
  color: string;
  tasks: Task[];
};

type SectionTaskColumnProps = Pick<
  TaskBoardViewProps,
  "accountName" | "accountPhotoUrl" | "onDeleteTask" | "onToggleTaskDone"
> & {
  group: SectionGroup;
  showDivider?: boolean;
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
  activeTaskId,
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
      className={`relative flex h-full min-h-0 min-w-0 bg-transparent ${
        showDivider ? TASK_COLUMN_DIVIDER_CLASS_NAME : ""
      }`}
    >
      <TaskColumn
        column={column}
        tasks={tasks}
        activeTaskId={activeTaskId}
        accountName={accountName}
        accountPhotoUrl={accountPhotoUrl}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onToggleTaskDone={onToggleTaskDone}
      />
    </div>
  );
};

const SectionTaskColumn = ({
  group,
  showDivider = false,
  accountName,
  accountPhotoUrl,
  onDeleteTask,
  onToggleTaskDone,
}: SectionTaskColumnProps) => {
  return (
    <div
      className={`relative flex h-full min-h-0 min-w-0 bg-transparent ${
        showDivider ? TASK_COLUMN_DIVIDER_CLASS_NAME : ""
      }`}
    >
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col px-3 pt-3 pb-0 bg-white">
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          <span className="min-w-0 truncate text-[13px] font-semibold text-[#1c1c1e]">
            {group.label}
          </span>
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded px-1 text-[11px] font-semibold text-[#9aa3b1]">
            {group.tasks.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-3">
          <div className="flex min-h-8 flex-col gap-2">
            {group.tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e5e7eb] px-3 py-4 text-center text-[12px] text-[#c7c7cc]">
                タスクなし
              </div>
            ) : (
              group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  accountName={accountName}
                  accountPhotoUrl={accountPhotoUrl}
                  onDelete={onDeleteTask}
                  onToggleDone={onToggleTaskDone}
                />
              ))
            )}
          </div>
        </div>
      </div>
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

  if (groupMode === "section") {
    return (
      <div
        className={`min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pt-4 pb-0 ${CALENDAR_PANEL_BACKGROUND_CLASS_NAME}`}
        onWheelCapture={handleBoardWheel}
      >
        <div
          className="grid h-full min-h-0 w-full gap-0"
          style={{
            gridTemplateColumns: `repeat(${Math.max(sectionGroups.length, 1)}, minmax(240px, 1fr))`,
            minWidth: `${Math.max(sectionGroups.length, 1) * 240}px`,
          }}
        >
          {sectionGroups.length === 0 ? (
            <SectionTaskColumn
              group={{ id: "empty", label: "セクション", color: "#8f929c", tasks: [] }}
              accountName={accountName}
              accountPhotoUrl={accountPhotoUrl}
              onDeleteTask={onDeleteTask}
              onToggleTaskDone={onToggleTaskDone}
            />
          ) : (
            sectionGroups.map((group, index) => (
              <SectionTaskColumn
                key={group.id}
                group={group}
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
    );
  }

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
