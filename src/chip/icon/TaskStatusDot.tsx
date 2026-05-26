import { CrownIcon } from "@/chip/icons/icons.task";
import { cn } from "@/lib/utils";

type TaskStatusDotProps = {
  color?: string;
  className?: string;
};

export const TASK_STATUS_DOT_CLASS_NAME = "h-4 w-4 shrink-0";

export const TaskStatusDot = ({ color, className }: TaskStatusDotProps) => {
  return (
    <CrownIcon
      className={cn(TASK_STATUS_DOT_CLASS_NAME, className)}
      style={{ color }}
    />
  );
};
