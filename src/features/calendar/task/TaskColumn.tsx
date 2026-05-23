import {
  defaultAnimateLayoutChanges,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

import type { Task, TaskColumn as TaskColumnType } from "./task.types";
import { TaskCard } from "./TaskCard";
import { TaskStatusDot } from "../../../chip/icon/TaskStatusDot";

type TaskColumnProps = {
  column: TaskColumnType;
  tasks: Task[];
  activeTaskId?: string | null;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onAddTask: (status: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleTaskDone: (id: string, done: boolean) => void;
};

type SortableTaskCardProps = {
  task: Task;
  activeTaskId?: string | null;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onDeleteTask: (id: string) => void;
  onToggleTaskDone: (id: string, done: boolean) => void;
};

const taskColumnBackground = "#ffffff";
const TASK_SORTABLE_TRANSITION = {
  duration: 180,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};
const TASK_SORTABLE_ANIMATE_LAYOUT_CHANGES: AnimateLayoutChanges = (args) => {
  if (args.isSorting || args.wasDragging) {
    return defaultAnimateLayoutChanges(args);
  }

  return true;
};

const SortableTaskCard = ({
  task,
  activeTaskId,
  accountName,
  accountPhotoUrl,
  onDeleteTask,
  onToggleTaskDone,
}: SortableTaskCardProps) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: task.id,
    animateLayoutChanges: TASK_SORTABLE_ANIMATE_LAYOUT_CHANGES,
    transition: TASK_SORTABLE_TRANSITION,
    data: {
      type: "task",
      task,
      status: task.status,
    },
  });
  const isActivePreview = activeTaskId === task.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isDragging
          ? undefined
          : transition ?? "transform 180ms cubic-bezier(0.2, 0, 0, 1)",
        willChange: transform ? "transform" : undefined,
      }}
      className={cn(
        "touch-none rounded-xl",
        "transition-[opacity,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
        isActivePreview && "opacity-40 saturate-75",
        isDragging && "relative z-10 opacity-0",
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
      />
    </div>
  );
};

export const TaskColumn = ({
  column,
  tasks,
  activeTaskId,
  accountName,
  accountPhotoUrl,
  onAddTask,
  onDeleteTask,
  onToggleTaskDone,
}: TaskColumnProps) => {
  const t = useT();
  const statusLabelMap = {
    not_started: t.taskStatusNotStarted,
    in_progress: t.taskStatusInProgress,
    review: t.taskStatusReview,
    done: t.taskStatusDone,
  };
  const isDragActive = activeTaskId !== null && activeTaskId !== undefined;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col rounded-xl p-3",
        "transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
        isDragActive && "shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)]",
      )}
      style={{ background: taskColumnBackground }}
    >
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <TaskStatusDot color={column.dotColor} />
        <span className="text-[13px] font-medium text-[#3f4652]">
          {statusLabelMap[column.id]}
        </span>
        <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold text-[#8f929c]">
          {tasks.length}
        </span>
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
      </div>

      <ScrollArea className="-mr-3 min-h-0 flex-1 overscroll-contain">
        <SortableContext
          id={column.id}
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={cn(
              "flex min-h-8 flex-col gap-2 pr-3",
              "transition-[padding] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
              tasks.length === 0 && isDragActive && "rounded-xl border border-dashed border-[#dfe3ea] bg-[#f8fafc] p-2",
            )}
          >
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                activeTaskId={activeTaskId}
                accountName={accountName}
                accountPhotoUrl={accountPhotoUrl}
                onDeleteTask={onDeleteTask}
                onToggleTaskDone={onToggleTaskDone}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
};