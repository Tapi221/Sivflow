import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { TaskEventChip } from "@/chip/eventchip/EventChip.task";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { Task } from "./task.types";
import { useTaskCard } from "./hooks/useTaskCard";

type TaskCardProps = {
  task: Task;
  accountName?: string | null;
  accountPhotoUrl?: string | null;
  isDragging?: boolean;
  onDelete?: (id: string) => void;
  onToggleDone?: (id: string, done: boolean) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, task: Task) => void;
};

export const TaskCard = ({
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

  const tokens = useMemo(
    () => generateColorTokens(category.text),
    [category.text],
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