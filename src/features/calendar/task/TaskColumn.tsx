import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

import type { Task, TaskColumn as TaskColumnType } from "./task.types";
import { TaskCard } from "./TaskCard";

type TaskColumnProps = {
  column: TaskColumnType;
  tasks: Task[];
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onAddTask: (status: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleTaskDone: (id: string, done: boolean) => void;
};

type SortableTaskCardProps = {
  task: Task;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onDeleteTask: (id: string) => void;
  onToggleTaskDone: (id: string, done: boolean) => void;
};

const taskColumnGradient =
  "linear-gradient(180deg, #f7f8fa 0%, #f4f6f9 46%, #f7f8fa 100%)";

const SortableTaskCard = ({
  task,
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
    data: {
      type: "task",
      task,
      status: task.status,
    },
  });
  const verticalTransform = transform ? { ...transform, x: 0 } : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(verticalTransform),
        transition,
      }}
      className={cn("touch-none", isDragging && "z-10 opacity-70")}
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

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-xl p-3"
      style={{ background: taskColumnGradient }}
    >
      {/* カラムヘッダー */}
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: column.dotColor }}
        />
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

      {/* タスクリスト */}
      <ScrollArea className="-mr-3 min-h-0 flex-1 overscroll-contain">
        <SortableContext
          id={column.id}
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex min-h-8 flex-col gap-2 pr-3">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
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