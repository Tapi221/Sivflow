import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/i18n/useT";

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

  return (
    <div className="flex h-full min-h-0 min-w-[260px] flex-1 flex-col rounded-xl bg-[#f7f8fa] p-3">
      {/* カラムヘッダー */}
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: column.dotColor }}
        />
        <span className="text-[13px] font-semibold text-[#1f2329]">
          {column.label}
        </span>
        <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold text-[#8f929c]">
          {tasks.length}
        </span>
      </div>

      {/* タスクリスト */}
      <ScrollArea className="-mr-3 min-h-0 flex-1 overscroll-contain">
        <div className="flex flex-col gap-2 pr-3">
          {/* Add task ボタン（上部） */}
          <button
            type="button"
            className="flex h-8 w-full items-center gap-1.5 rounded-lg px-2 text-[12px] text-[#b0b4be] transition-colors hover:bg-[#eceef1] hover:text-[#6b7280]"
            onClick={() => onAddTask(column.id)}
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
              <path
                d="M7 2.5v9M2.5 7h9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {t.addTask}
          </button>

          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              accountName={accountName}
              accountPhotoUrl={accountPhotoUrl}
              onDelete={onDeleteTask}
              onToggleDone={onToggleTaskDone}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};