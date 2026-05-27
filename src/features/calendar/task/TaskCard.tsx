import { memo, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { TaskEventChip } from "@/chip/eventchip/EventChip.task";
import { useTaskCard } from "@/features/calendar/task/hooks/useTaskCard";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { Task } from "./task.types";

type TaskCardProps = {
  task: Task;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  isDragging?: boolean;
  onDelete?: (id: string) => void;
  onToggleDone?: (id: string, done: boolean) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, task: Task) => void;
};

const areTaskCardPropsEqual = (
  previousProps: TaskCardProps,
  nextProps: TaskCardProps,
) => {
  const previousTask = previousProps.task;
  const nextTask = nextProps.task;

  return (
    previousTask.id === nextTask.id &&
    previousTask.title === nextTask.title &&
    previousTask.description === nextTask.description &&
    previousTask.subtasks === nextTask.subtasks &&
    previousTask.status === nextTask.status &&
    previousTask.priority === nextTask.priority &&
    previousTask.category === nextTask.category &&
    previousTask.dueDate === nextTask.dueDate &&
    previousTask.assignee === nextTask.assignee &&
    previousTask.createdAt === nextTask.createdAt &&
    previousTask.taskListColor === nextTask.taskListColor &&
    previousTask.scheduledStart === nextTask.scheduledStart &&
    previousTask.scheduledEnd === nextTask.scheduledEnd &&
    previousTask.googleCalendarId === nextTask.googleCalendarId &&
    previousTask.googleEventId === nextTask.googleEventId &&
    previousProps.accountName === nextProps.accountName &&
    previousProps.accountPhotoUrl === nextProps.accountPhotoUrl &&
    previousProps.isDragging === nextProps.isDragging &&
    previousProps.onDelete === nextProps.onDelete &&
    previousProps.onToggleDone === nextProps.onToggleDone &&
    previousProps.onContextMenu === nextProps.onContextMenu
  );
};

const TaskCardComponent = ({
  task,
  accountName,
  accountPhotoUrl,
  isDragging = false,
  onDelete,
  onToggleDone,
  onContextMenu,
}: TaskCardProps) => {
  const {
    priority,
    category,
    formattedDate,
    isDone,
    checkboxLabel,
    chipName,
    handleToggleDone,
    handleDelete,
  } = useTaskCard({
    task,
    accountName,
    onDelete,
    onToggleDone,
  });

  const chipColor = task.taskListColor ?? category.text;
  const tokens = useMemo(
    () => generateColorTokens(chipColor),
    [chipColor],
  );

  return (
    <div onContextMenu={onContextMenu ? (event) => onContextMenu(event, task) : undefined}>
      <TaskEventChip
        title={task.title}
        categoryLabel={category.label}
        priorityLabel={priority.label}
        formattedDate={formattedDate}
        isDone={isDone}
        checkboxColor={tokens.border}
        checkboxLabel={checkboxLabel}
        chipName={chipName}
        accountPhotoUrl={accountPhotoUrl}
        tokens={tokens}
        showAssignee={Boolean(task.assignee)}
        isDragging={isDragging}
        onDelete={onDelete ? handleDelete : undefined}
        onToggleDone={handleToggleDone}
      />
    </div>
  );
};

const TaskCard = memo(TaskCardComponent, areTaskCardPropsEqual);

TaskCard.displayName = "TaskCard";

export { TaskCard };
