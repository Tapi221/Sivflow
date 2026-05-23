import { CalendarIcon as ScheduleCalendarIcon } from "@/components/icons/icons.schedule";
import { AnimatedSquareCheckbox } from "@/chip/checkbox/AnimatedSquareCheckbox";
import { GoogleAccountChip } from "@/chip/budge/GoogleAccountChip";
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

const TaskMenuIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="8" cy="4" r="1.15" fill="currentColor" />
    <circle cx="8" cy="8" r="1.15" fill="currentColor" />
    <circle cx="8" cy="12" r="1.15" fill="currentColor" />
  </svg>
);

export const TaskCard = ({
  task,
  accountName,
  accountPhotoUrl,
  isDragging = false,
  onDelete,
  onToggleDone,
}: TaskCardProps) => {
  const {
    priority,
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
        // ─ Notion風: フラット・角丸小・影なし ─
        "group relative w-full min-w-0 overflow-hidden rounded-md border border-[#e9eaed] bg-white px-3 py-2",
        // hover は背景のみ変化（影を足さない）
        "transition-[background-color,border-color] duration-100",
        "hover:bg-[#f7f7f5] hover:border-[#e2e3e6]",
        isDragging
          ? "cursor-grabbing bg-white shadow-[0_4px_16px_rgba(15,23,42,0.10)] border-[#d5d6d9]"
          : "cursor-grab shadow-none",
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

            {/* メニューボタン */}
            <button
              type="button"
              className="-mr-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[#a8a9ae] opacity-0 transition-[background-color,color,opacity] duration-100 hover:bg-[#ebebea] hover:text-[#4a4a4d] active:scale-95 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Task menu"
              onClick={handleDelete}
            >
              <TaskMenuIcon className="h-3.5 w-3.5" />
            </button>
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

            <span
              className="inline-flex h-[18px] items-center rounded px-1.5 text-[11px] font-medium"
              style={{ backgroundColor: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
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