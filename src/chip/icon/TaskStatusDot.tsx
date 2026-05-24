import { CrownIcon } from "@/components/icons/icons.task";

import { cn } from "@/lib/utils";

type TaskStatusDotProps = {
  color?: string;
  className?: string;
};

export const TASK_STATUS_DOT_CLASS_NAME = "h-3.5 w-3.5 shrink-0";

export const TaskStatusDot = ({ color, className }: TaskStatusDotProps) => {
  return (
    <CrownIcon
      className={cn(TASK_STATUS_DOT_CLASS_NAME, className)}
      style={{ color }}
    />
  );
};
