import { format } from "date-fns";

import { CalendarIcon as ScheduleCalendarIcon } from "@/components/icons/schedule.icons";
import { AnimatedSquareCheckbox } from "@/features/calendar/chip/checkbox/AnimatedSquareCheckbox";
import { GoogleAccountChip } from "@/features/calendar/chip/GoogleAccountChip";
import { cn } from "@/lib/utils";

import { CATEGORY_CONFIG, PRIORITY_CONFIG } from "./task.types";
import type { Task } from "./task.types";

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
  onDelete,
  onToggleDone,
}: TaskCardProps) => {
  const priority = PRIORITY_CONFIG[task.priority];

  let category = CATEGORY_CONFIG[task.category];
  if (!category) {
    category = { bg: "#f3f4f6", text: "#6b7280" };
  }

  let formattedDate: string | null = null;
  if (task.dueDate) {
    formattedDate = format(new Date(task.dueDate), "MMM d");
  }

  const isDone = task.status === "done";
  const checkboxColor = isDone ? "#007aff" : "#aeb4bf";
  const checkboxLabel = isDone ? "Mark task as not done" : "Complete task";
  const chipName = accountName ?? task.assignee ?? "Google account";

  let dateContent = <span />;
  if (formattedDate) {
    dateContent = (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-[#f2f2f7] px-1.5 text-[11px] font-medium tabular-nums text-[#8e8e93]">
        <ScheduleCalendarIcon className="h-4 w-4 shrink-0 text-[#9da3af]" />
        {formattedDate}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded border border-white/80 bg-white/90 px-3 pt-3 pb-2",
        "backdrop-blur-xl",
        "transition-[transform,background-color,border-color] duration-200 ease-out",
        "hover:border-white hover:bg-white",
        "active:scale-[0.998]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-6 rounded-full bg-white/30 blur-xl" />

      <div className="relative flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform active:scale-90"
          aria-label={checkboxLabel}
          title={checkboxLabel}
          onClick={() => {
            if (onToggleDone) {
              onToggleDone(task.id, !isDone);
            }
          }}
        >
          <AnimatedSquareCheckbox
            checked={isDone}
            color={checkboxColor}
            className="h-3.5 w-3.5"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div
              className={cn(
                "min-w-0 flex-1 truncate text-[12px] font-medium leading-none tracking-[-0.005em] text-[#1c1c1e]",
                isDone && "text-[#8e8e93] line-through decoration-[#c7c7cc]",
              )}
            >
              {task.title}
            </div>

            <button
              type="button"
              className="-mr-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[#8e8e93] opacity-0 transition-[background-color,color,opacity,transform] hover:bg-[#f2f2f7] hover:text-[#3a3a3c] active:scale-90 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Task menu"
              onClick={() => {
                if (onDelete) {
                  onDelete(task.id);
                }
              }}
            >
              <TaskMenuIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 min-h-5">
            <div
              className={cn(
                "-ml-[26px] flex w-[calc(100%+26px)] min-w-0 flex-wrap items-center gap-1",
                task.assignee && "pr-7",
              )}
            >
              {dateContent}

              <span
                className="inline-flex h-5 items-center rounded-full border border-white/70 px-2 text-[11px] font-semibold"
                style={{ backgroundColor: category.bg, color: category.text }}
              >
                {task.category}
              </span>

              <span
                className="inline-flex h-5 items-center rounded-full border border-white/70 px-2 text-[11px] font-semibold"
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
          <GoogleAccountChip
            name={chipName}
            photoUrl={accountPhotoUrl}
          />
        </div>
      )}
    </div>
  );
};