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
  const checkboxColor = isDone ? "#193a5c" : "#9ca3af";
  const checkboxLabel = isDone ? "Mark task as not done" : "Complete task";
  const chipName = accountName ?? task.assignee ?? "Google account";

  let dateContent = <span />;
  if (formattedDate) {
    dateContent = (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f7fa] px-1.5 text-[11px] font-medium tabular-nums text-[#9aa3b1]">
        <ScheduleCalendarIcon className="h-4 w-4 shrink-0 text-[#a8b0bc]" />
        {formattedDate}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[14px] border border-[#eef0f4] bg-white p-3",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_7px_18px_rgba(15,23,42,0.06)]",
        "transition-[box-shadow,background-color,border-color] duration-200 ease-out",
        "hover:border-[#e5e8ef] hover:bg-white hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_24px_rgba(15,23,42,0.08)]",
        isDragging && "shadow-[0_8px_20px_rgba(15,23,42,0.16)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white" />

      <div className="flex items-start gap-3">
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
                "min-w-0 flex-1 truncate text-[12px] font-medium leading-none text-[#24262d]",
                isDone && "text-[#9aa3b1] line-through decoration-[#b8c0cc]",
              )}
            >
              {task.title}
            </div>

            <button
              type="button"
              className="-mr-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[#a1a8b3] opacity-0 transition-[background-color,color,opacity] hover:bg-[#f3f4f7] hover:text-[#657080] group-hover:opacity-100 focus-visible:opacity-100"
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

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold"
              style={{ backgroundColor: category.bg, color: category.text }}
            >
              {task.category}
            </span>

            <span
              className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold"
              style={{ backgroundColor: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">{dateContent}</div>

            {task.assignee && (
              <GoogleAccountChip
                name={chipName}
                photoUrl={accountPhotoUrl}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};