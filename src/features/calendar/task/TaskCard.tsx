import { GoogleAccountChip } from "@/chip/budge/GoogleAccountChip";
import { TaskPriorityBadge } from "@/chip/budge/TaskPriorityBadge";
import { AnimatedSquareCheckbox } from "@/chip/checkbox/AnimatedSquareCheckbox";
import { TrashIcon } from "@/components/icons/icons.card";
import { CalendarIcon as ScheduleCalendarIcon } from "@/components/icons/icons.schedule";
import { cn } from "@/lib/utils";
import type { Task } from "./task.types";
import { useTaskCard } from "./hooks/useTaskCard";

type TaskCardProps = {
  task: Task;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  isDragging?: boolean;
  onDelete?: (id: string) => void;
  onToggleDone?: (id: string, done: boolean) => void;
};

export const TaskCard = ({
  task,
  accountName,
  accountPhotoUrl,
  isDragging = false,
  onDelete,
  onToggleDone,
}: TaskCardProps) => {
  const {
    category,
    formattedDate,
    isDone,
    checkboxColor,
    checkboxLabel,
    chipName,
    handleToggleDone,
    handleDelete,
  } = useTaskCard({
    task,
    accountName,
    onDelete,
    onToggleDone,
  });

  return (
    <div
      className={cn(
        // ─ ほんの少し紙っぽい: ほぼ白の柔らかい色・控えめな影 ─
        "group relative w-full min-w-0 overflow-hidden rounded-md border-[1.5px] border-[#e8e6e2] bg-[#fbfbfa] px-3 py-2 shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
        "transition-[background-color,border-color,box-shadow] duration-100",
        "hover:bg-[#f8f8f6] hover:border-[#e1dfda] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]",
        isDragging
          ? "cursor-grabbing bg-[#fbfbfa] shadow-[0_8px_24px_rgba(15,23,42,0.10)] border-[#d8d5cf]"
          : "cursor-grab",
      )}
    >
      <div className="relative flex min-w-0 items-start gap-2.5">
        {/* チェックボックス */}
        <button
          type="button"
          className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform active:scale-90"
          aria-label={checkboxLabel}
          title={checkboxLabel}
          onClick={handleToggleDone}
        >
          <AnimatedSquareCheckbox
            checked={isDone}
            color={checkboxColor}
            className="h-3.5 w-3.5"
          />
        </button>

        <div className="min-w-0 flex-1">
          {/* タイトル行 */}
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div
              className={cn(
                "min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-[#1c1c1e]",
                isDone && "text-[#a8a8a8] line-through decoration-[#c7c7cc]",
              )}
            >
              {task.title}
            </div>

            {onDelete && (
              <button
                type="button"
                className="-mr-1 flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded text-[#a8a9ae] opacity-0 transition-[background-color,color,opacity] duration-100 hover:bg-[#fee2e2] hover:text-[#ff3b30] active:scale-95 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="タスクを削除"
                title="タスクを削除"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete();
                }}
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* メタ情報行 */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {formattedDate && (
              <span className="inline-flex items-center gap-[3px] rounded px-1 py-0.5 text-[11px] font-medium text-[#8a8f98] bg-transparent">
                <ScheduleCalendarIcon className="h-3 w-3 shrink-0" />
                {formattedDate}
              </span>
            )}

            {/* カテゴリタグ: Notion風は背景薄め・角丸小 */}
            <span
              className="inline-flex h-[18px] items-center rounded px-1.5 text-[11px] font-medium"
              style={{ backgroundColor: category.bg, color: category.text }}
            >
              {category.label}
            </span>

            <TaskPriorityBadge priority={task.priority} />
          </div>
        </div>
      </div>

      {task.assignee && (
        <div className="pointer-events-none absolute right-2.5 bottom-2 rounded-full ring-1 ring-white">
          <GoogleAccountChip name={chipName} photoUrl={accountPhotoUrl} />
        </div>
      )}
    </div>
  );
};