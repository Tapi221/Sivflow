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
  isDragging = false,
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
  const checkboxColor = isDone ? "#34c759" : "#aeb4bf";
  const checkboxLabel = isDone ? "Mark task as not done" : "Complete task";
  const chipName = accountName ?? task.assignee ?? "Google account";

  let dateContent = <span />;
  if (formattedDate) {
    dateContent = (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-white/70 bg-[#f2f2f7] px-2 text-[11px] font-semibold tabular-nums text-[#8e8e93] shadow-[inset_0_1px_0_rgba(255,255,255,0.70)]">
        <ScheduleCalendarIcon className="h-4 w-4 shrink-0 text-[#9da3af]" />
        {formattedDate}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[20px] border border-white/80 bg-white/90 px-4 pt-3.5 pb-3",
        "shadow-[0_10px_30px_rgba(15,23,42,0.08),0_1px_1px_rgba(15,23,42,0.04)] backdrop-blur-xl",
        "transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out will-change-transform",
        "hover:-translate-y-0.5 hover:border-white hover:bg-white hover:shadow-[0_14px_36px_rgba(15,23,42,0.11),0_1px_1px_rgba(15,23,42,0.04)]",
        "active:translate-y-0 active:scale-[0.995]",
        isDragging && "scale-[1.01] shadow-[0_18px_42px_rgba(15,23,42,0.16)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-10 rounded-full bg-white/35 blur-2xl" />

      <div className="relative flex items-start gap-3">
        <button
          type="button"
          className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-[9px] transition-transform active:scale-90"
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
            className="h-[18px] w-[18px]"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div
              className={cn(
                "min-w-0 flex-1 truncate text-[15px] font-semibold leading-6 tracking-[-0.01em] text-[#1c1c1e]",
                isDone && "text-[#8e8e93] line-through decoration-[#c7c7cc]",
              )}
            >
              {task.title}
            </div>

            <button
              type="button"
              className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8e8e93] opacity-0 transition-[background-color,color,opacity,transform] hover:bg-[#f2f2f7] hover:text-[#3a3a3c] active:scale-90 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Task menu"
              onClick={() => {
                if (onDelete) {
                  onDelete(task.id);
                }
              }}
            >
              <TaskMenuIcon className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="relative mt-3 min-h-7">
            <div
              className={cn(
                "-ml-9 flex w-[calc(100%+36px)] min-w-0 flex-wrap items-center gap-1.5",
                task.assignee && "pr-9",
              )}
            >
              {dateContent}

              <span
                className="inline-flex h-6 items-center rounded-full border border-white/70 px-2.5 text-[12px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                style={{ backgroundColor: category.bg, color: category.text }}
              >
                {task.category}
              </span>

              <span
                className="inline-flex h-6 items-center rounded-full border border-white/70 px-2.5 text-[12px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                style={{ backgroundColor: priority.bg, color: priority.text }}
              >
                {priority.label}
              </span>
            </div>

            {task.assignee && (
              <div className="pointer-events-none absolute right-0 top-0 rounded-full shadow-[0_4px_12px_rgba(15,23,42,0.14)] ring-2 ring-white">
                <GoogleAccountChip
                  name={chipName}
                  photoUrl={accountPhotoUrl}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};