import { format } from "date-fns";
import { GoogleAccountChip } from "@/features/calendar/chip/GoogleAccountChip";
import {
  CalendarIcon as ScheduleCalendarIcon,
  CheckSquareFilledIcon,
  SquareOutlineIcon,
} from "@/components/icons/schedule.icons";
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from "./task.types";
import type { Task } from "./task.types";

type TaskCardProps = {
  task: Task;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  onDelete?: (id: string) => void;
  onToggleDone?: (id: string, done: boolean) => void;
};

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
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[#9ca3af] hover:text-[#193a5c]"
          aria-label="Complete task"
          onClick={() => {
            if (onToggleDone) {
              onToggleDone(task.id, !isDone);
            }
          }}
        >
          {isDone ? (
            <CheckSquareFilledIcon className="h-4 w-4 text-[#193a5c]" />
          ) : (
            <SquareOutlineIcon className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 truncate text-[13px] font-medium leading-[18px] text-[#24262d]">
              {task.title}
            </div>

            <button
              type="button"
              className="-mr-1 -mt-1 rounded p-1 text-[#9ca3af] hover:bg-[#f3f4f6]"
              aria-label="Task menu"
              onClick={() => {
                if (onDelete) {
                  onDelete(task.id);
                }
              }}
            >
              ⋮
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