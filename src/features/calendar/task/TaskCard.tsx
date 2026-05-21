import { format } from "date-fns";
import { CalendarIcon as ScheduleCalendarIcon } from "@/components/icons/schedule.icons";
import { AnimatedSquareCheckbox } from "@/features/calendar/chip/checkbox/AnimatedSquareCheckbox";
import { GoogleAccountChip } from "@/features/calendar/chip/GoogleAccountChip";
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from "./task.types";
import type { Task } from "./task.types";

type TaskCardProps = {
  task: Task;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
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
  const checkboxColor = isDone ? "#193a5c" : "#9ca3af";
  const checkboxLabel = isDone ? "Mark task as not done" : "Complete task";
  const chipName = accountName ?? task.assignee ?? "Google account";

  let dateContent = <span />;
  if (formattedDate) {
    dateContent = (
      <span className="flex items-center gap-1 text-[11px] text-[#9ca3af]">
        <ScheduleCalendarIcon className="h-4 w-4 shrink-0" />
        {formattedDate}
      </span>
    );
  }

  return (
    <div className="group relative rounded-lg border border-[#e9eaed] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center"
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
            <div className="min-w-0 flex-1 truncate text-[13px] font-medium leading-[18px] text-[#24262d]">
              {task.title}
            </div>

            <button
              type="button"
              className="-mr-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[#9ca3af] opacity-0 transition-opacity hover:bg-[#f3f4f6] group-hover:opacity-100 focus-visible:opacity-100"
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
              className="inline-flex h-5 items-center rounded px-2 text-[11px] font-medium"
              style={{ backgroundColor: category.bg, color: category.text }}
            >
              {task.category}
            </span>

            <span
              className="inline-flex h-5 items-center rounded px-2 text-[11px] font-medium"
              style={{ backgroundColor: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
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