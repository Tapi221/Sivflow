import { FlagIcon } from "@/components/icons/icons.card";
import { PRIORITY_CONFIG } from "@/features/calendar/task/task.types";
import type { TaskPriority } from "@/features/calendar/task/task.types";

type TaskPriorityBadgeProps = {
  priority: TaskPriority;
};

export const TaskPriorityBadge = ({ priority }: TaskPriorityBadgeProps) => {
  const priorityConfig = PRIORITY_CONFIG[priority];

  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        background: priorityConfig.bg,
        color: priorityConfig.text,
      }}
    >
      <FlagIcon className="h-3 w-3 shrink-0" />
      {priorityConfig.label}
    </span>
  );
};