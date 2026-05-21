import { format } from "date-fns";
import { GoogleAccountChip } from "@/features/calendar/chip/GoogleAccountChip";
import { CalendarIcon as ScheduleCalendarIcon } from "@/icons/schedule.icons";
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from "./task.types";
import type { Task } from "./task.types";

// ==============================================

type TaskCardProps = {
  task: Task;
  onDelete?: (id: string) => void;
};

export const TaskCard = ({ task, onDelete }: TaskCardProps) => {
  const priority = PRIORITY_CONFIG[task.priority];

  let category = CATEGORY_CONFIG[task.category];
  if (!category) {
    category = { bg: "#f3f4f6", text: "#6b7280" };
  }

  let formattedDate: string | null = null;
  if (task.dueDate) {
    formattedDate = format(new Date(task.dueDate), "MMM d");
  }

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
          className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[#cfd3dc] bg-white"
          aria-label="Complete task"
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[#24262d]">
            {task.title}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="rounded px-2 py-1 text-xs font-medium"
              style={{ backgroundColor: category.bg, color: category.text }}
            >
              {task.category}
            </span>

            <span
              className="rounded px-2 py-1 text-xs font-medium"
              style={{ backgroundColor: priority.bg, color: priority.text }}
            >
              {priority.label}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {dateContent}

            {task.assignee && <GoogleAccountChip name={task.assignee} />}
          </div>
        </div>

        <button
          type="button"
          className="rounded p-1 text-[#9ca3af] hover:bg-[#f3f4f6]"
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
    </div>
  );
};