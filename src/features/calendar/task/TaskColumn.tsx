import { motion } from "framer-motion";
import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { TaskStatusDot } from "@/chip/icon/TaskStatusDot";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import { TASK_TYPO } from "@/styles/tokens/typography";
import { TaskSortableContext, useTaskSortableCard } from "@/features/dnd/task/taskDnd.components";
import { TASK_DND_DRAG_LAYOUT_ANIMATION_DURATION_MS, TASK_DND_LAYOUT_ANIMATION_DURATION_MS } from "@/features/dnd/task/taskDnd.config";
import type { TaskDropTarget } from "@/features/dnd/task/taskDnd.types";
import { TaskCard } from "./TaskCard";
import { TaskInsertionSlot } from "./TaskInsertionSlot";
import type { Task, TaskStatus } from "./task.types";
import { TASK_COLUMNS } from "./task.types";

type TaskColumnView = {
  id: string;
  label: string;
  dotColor: string;
};

type TaskColumnProps = {
  column: TaskColumnView;
  tasks: Task[];
  activeDropTarget?: TaskDropTarget | null;
  activeTaskId?: string | null;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onAddTask?: (columnId: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleTaskDone: (id: string, done: boolean) => void;
  onTaskContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, task: Task) => void;
  translateStatusLabel?: boolean;
};

type SortableTaskCardProps = {
  task: Task;
  columnId: string;
  activeTaskId?: string | null;
  isDragActive?: boolean;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onDeleteTask: (id: string) => void;
  onToggleTaskDone: (id: string, done: boolean) => void;
  onTaskContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, task: Task) => void;
};

const taskColumnBackground = "#ffffff";
const TASK_LAYOUT_MOTION_EASING = [0.16, 1, 0.3, 1] as const;
const TASK_LAYOUT_MOTION_TRANSITION = {
  duration: TASK_DND_LAYOUT_ANIMATION_DURATION_MS / 1000,
  ease: TASK_LAYOUT_MOTION_EASING,
};
const TASK_DRAG_LAYOUT_MOTION_TRANSITION = {
  duration: TASK_DND_DRAG_LAYOUT_ANIMATION_DURATION_MS / 1000,
  ease: TASK_LAYOUT_MOTION_EASING,
};

const isTaskStatus = (value: string): value is TaskStatus => {
  return TASK_COLUMNS.some((column) => column.id === value);
};

const SortableTaskCard = ({
  task,
  columnId,
  activeTaskId,
  isDragActive = false,
  accountName,
  accountPhotoUrl,
  onDeleteTask,
  onToggleTaskDone,
  onTaskContextMenu,
}: SortableTaskCardProps) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
  } = useTaskSortableCard({ task, columnId });
  const isActivePreview = activeTaskId === task.id;

  return (
    <motion.div
      ref={setNodeRef}
      layout="position"
      transition={
        isDragActive
          ? TASK_DRAG_LAYOUT_MOTION_TRANSITION
          : TASK_LAYOUT_MOTION_TRANSITION
      }
      className={cn(
        "relative z-10 rounded-xl touch-none transform-gpu",
        "transition-[opacity,filter] duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)]",
        isActivePreview && "opacity-40 saturate-75",
        isDragging && "relative z-20 opacity-0",
      )}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        accountName={accountName}
        accountPhotoUrl={accountPhotoUrl}
        isDragging={isDragging}
        onDelete={onDeleteTask}
        onToggleDone={onToggleTaskDone}
        onContextMenu={onTaskContextMenu}
      />
    </motion.div>
  );
};

export const TaskColumn = ({
  column,
  tasks,
  activeDropTarget,
  activeTaskId,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
  onTaskContextMenu,
  translateStatusLabel = false,
}: TaskColumnProps) => {
  const t = useT();
  const statusLabelMap = {
    not_started: t.taskStatusNotStarted,
    in_progress: t.taskStatusInProgress,
    review: t.taskStatusReview,
    done: t.taskStatusDone,
  };
  const columnLabel =
    translateStatusLabel && isTaskStatus(column.id)
      ? statusLabelMap[column.id]
      : column.label;
  const isDragActive = activeTaskId !== null && activeTaskId !== undefined;
  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const nonActiveTasks = useMemo(
    () => tasks.filter((task) => task.id !== activeTaskId),
    [activeTaskId, tasks],
  );
  const nonActiveTaskInsertIndexById = useMemo(() => {
    return new Map(nonActiveTasks.map((task, index) => [task.id, index + 1]));
  }, [nonActiveTasks]);
  const activeInsertIndex =
    activeDropTarget?.columnId === column.id ? activeDropTarget.insertIndex : null;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col px-3 pt-1.5 pb-0",
        "transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
        isDragActive && "shadow-[inset_0_0_0_1px_rgba(17,24,39,0.03)]",
      )}
      style={{ background: taskColumnBackground }}
    >
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <TaskStatusDot color={column.dotColor} />
        <span className={TASK_TYPO.columnTitle}>
          {columnLabel}
        </span>
        <span className={cn("ml-0.5 flex h-4 min-w-4 items-center justify-center rounded px-1", TASK_TYPO.count)}>
          {tasks.length}
        </span>
        {onAddTask ? (
          <button
            type="button"
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-[#9aa3b1] transition-colors hover:bg-[#eceef1] hover:text-[#193a5c]"
            onClick={() => onAddTask(column.id)}
            aria-label={t.addTask}
            title={t.addTask}
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
              <path
                d="M7 2.5v9M2.5 7h9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      <ScrollArea className="-mr-3 min-h-0 flex-1 overscroll-contain">
        <TaskSortableContext columnId={column.id} taskIds={taskIds}>
          <div
            className={cn(
              "flex min-h-8 flex-col pr-3",
              "transition-[padding,border-color,background-color] duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)]",
            )}
          >
            <TaskInsertionSlot
              columnId={column.id}
              insertIndex={0}
              overTaskId={nonActiveTasks[0]?.id ?? null}
              isActive={activeInsertIndex === 0}
              isFirst
            />
            {tasks.map((task) => {
              const isActiveTask = task.id === activeTaskId;
              const insertIndex = isActiveTask
                ? -1
                : nonActiveTaskInsertIndexById.get(task.id) ?? -1;
              const isLastTask = insertIndex === nonActiveTasks.length;

              return (
                <div key={task.id}>
                  <SortableTaskCard
                    task={task}
                    columnId={column.id}
                    activeTaskId={activeTaskId}
                    isDragActive={isDragActive}
                    accountName={accountName}
                    accountPhotoUrl={accountPhotoUrl}
                    onDeleteTask={onDeleteTask}
                    onToggleTaskDone={onToggleTaskDone}
                    onTaskContextMenu={onTaskContextMenu}
                  />
                  {!isActiveTask && (
                    <TaskInsertionSlot
                      columnId={column.id}
                      insertIndex={insertIndex}
                      overTaskId={task.id}
                      position="after"
                      isActive={activeInsertIndex === insertIndex}
                      isLast={isLastTask}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </TaskSortableContext>
      </ScrollArea>
    </div>
  );
};