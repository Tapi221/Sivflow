type TaskStatusDotProps = {
  color?: string;
};

export const TASK_STATUS_DOT_CLASS_NAME = "h-2 w-2 shrink-0 rounded-full";

export const TaskStatusDot = ({ color }: TaskStatusDotProps) => {
  return (
    <span
      className={TASK_STATUS_DOT_CLASS_NAME}
      style={{ backgroundColor: color }}
    />
  );
};
