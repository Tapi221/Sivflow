import { PRIORITY_CONFIG } from "@/features/calendar/task/task.types";
import type { TaskPriority } from "@/features/calendar/task/task.types";

type TaskPriorityBadgeProps = {
  priority: TaskPriority;
};

export const TaskPriorityBadge = ({ priority }: TaskPriorityBadgeProps) => {
  const priorityConfig = PRIORITY_CONFIG[priority];

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        background: priorityConfig.bg,
        color: priorityConfig.text,
      }}
    >
      {priorityConfig.label}
    </span>
  );
};