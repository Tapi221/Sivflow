import { CalendarIcon as ScheduleCalendarIcon } from "@/components/icons/icons.schedule";
import { AnimatedSquareCheckbox } from "@/chip/checkbox/AnimatedSquareCheckbox";
import { GoogleAccountChip } from "@/chip/budge/GoogleAccountChip";
import { cn } from "@/lib/utils";
import { TASK_TYPO } from "@/styles/tokens/typography";

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
        "group relative w-full min-w-0 overflow-hidden rounded-xl border border-[#e6e8ec] bg-white px-3 py-2.5",
        "shadow-none",
        "transition-[transform,background-color,border-color,box-shadow,filter] duration-[180ms] ease-[cubic-bezier(.22,1,.36,1)]",
        "hover:border-[#dfe3ea] hover:shadow-[0_1px_4px_rgba(15,23,42,0.05)]",
        "active:scale-[0.999]",
        isDragging
          ? "cursor-grabbing scale-[1.01] border-[#dfe3ea] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.035]"
          : "cursor-grab",
      )}
    >
      <div className="relative flex min-w-0 items-start gap-3">
        <button
          type="button"
          className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform active:scale-90"
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
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div
              className={cn(
                "min-w-0 flex-1 truncate",
                TASK_TYPO.cardTitle,
                isDone && "text-[#8e8e93] line-through decoration-[#c7c7cc]",
              )}
            >
              {task.title}
            </div>

            <button
              type="button"
              className="-mr-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[#8e8e93] opacity-0 transition-[background-color,color,opacity,transform] duration-150 hover:bg-[#f5f5f7] hover:text-[#4a4a4d] active:scale-95 group-hover:opacity-80 focus-visible:opacity-100"
              aria-label="Task menu"
              onClick={handleDelete}
            >
              <TaskMenuIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2.5 min-h-5">
            <div
              className={cn(
                "-ml-[26px] flex w-[calc(100%+26px)] min-w-0 flex-wrap items-center gap-1",
                task.assignee && "pr-7",
              )}
            >
              {formattedDate && (
                <span className={cn("inline-flex items-center gap-1 rounded-full border border-[#eceef1] bg-[#f7f8fa] px-1.5 tabular-nums", TASK_TYPO.metaChip)}>
                  <ScheduleCalendarIcon className="h-4 w-4 shrink-0 text-[#9da3af]" />
                  {formattedDate}
                </span>
              )}

              <span
                className={cn("inline-flex h-5 items-center rounded-full border border-transparent px-2", TASK_TYPO.metaPill)}
                style={{ backgroundColor: category.bg, color: category.text }}
              >
                {category.label}
              </span>

              <span
                className={cn("inline-flex h-5 items-center rounded-full border border-transparent px-2", TASK_TYPO.metaPill)}
                style={{ backgroundColor: priority.bg, color: priority.text }}
              >
                {priority.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {task.assignee && (
        <div className="pointer-events-none absolute right-3 bottom-2 rounded-full ring-1 ring-white">
          <GoogleAccountChip name={chipName} photoUrl={accountPhotoUrl} />
        </div>
      )}
    </div>
  );
};