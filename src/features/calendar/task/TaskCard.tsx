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
  const checkboxColor = isDone ? "#193a5c" : "#b8c0cc";
  const checkboxLabel = isDone ? "Mark task as not done" : "Complete task";
  const chipName = accountName ?? task.assignee ?? "Google account";

  let dateContent = <span />;
  if (formattedDate) {
    dateContent = (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#f5f6f9] px-2 text-[11px] font-medium tabular-nums text-[#8f96a3]">
        <ScheduleCalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#a3abb8]" />
        {formattedDate}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[18px] border border-white/80 bg-white/95 p-3.5",
        "shadow-[0_1px_1px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur-xl",
        "transition-[box-shadow,transform,background-color,border-color] duration-200 ease-out",
        "hover:-translate-y-[1px] hover:border-white hover:bg-white hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_34px_rgba(15,23,42,0.10)]",
        isDragging &&
          "scale-[1.01] shadow-[0_10px_30px_rgba(15,23,42,0.18)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/95" />
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] transition-transform active:scale-90"
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
            className="h-5 w-5"
          />
        </button>

        <div className="min-w-0 flex-1 pr-5">
          <div className="flex min-h-5 items-start gap-2">
            <div
              className={cn(
                "min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[#20242c]",
                isDone && "text-[#9aa3b1] line-through decoration-[#b8c0cc]",
              )}
            >
              {task.title}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold"
              style={{ backgroundColor: category.bg, color: category.text }}
            >
              {task.category}
            </span>

            <span
              className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold"
              style={{ backgroundColor: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <div className="min-w-0">{dateContent}</div>

            {task.assignee && (
              <GoogleAccountChip
                name={chipName}
                photoUrl={accountPhotoUrl}
              />
            )}
          </div>
        </div>

        <button
          type="button"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#a1a8b3] opacity-70 transition-[background-color,color,opacity] hover:bg-[#f1f3f6] hover:text-[#657080] hover:opacity-100 focus-visible:opacity-100"
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
    </div>
  );
};