import { useMemo } from "react";

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
};

export const TaskCard = ({
  task,
  accountName,
  accountPhotoUrl,
  isDragging = false,
  onDelete,
  onToggleDone,
}: TaskCardProps) => {
  const {
    priority,
    category,
    formattedDate,
    isDone,
    checkboxColor,
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
    <TaskEventChip
      title={task.title}
      categoryLabel={category.label}
      priorityLabel={priority.label}
      formattedDate={formattedDate}
      isDone={isDone}
      checkboxColor={checkboxColor}
      checkboxLabel={checkboxLabel}
      chipName={chipName}
      accountPhotoUrl={accountPhotoUrl}
      tokens={tokens}
      showAssignee={Boolean(task.assignee)}
      isDragging={isDragging}
      onDelete={onDelete ? handleDelete : undefined}
      onToggleDone={handleToggleDone}
    />
  );
};