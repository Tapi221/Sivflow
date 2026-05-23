import { useCallback, useMemo } from "react";
import { format } from "date-fns";

import { CATEGORY_CONFIG, PRIORITY_CONFIG } from "./task.types";
import type { Task } from "./task.types";

type UseTaskCardParams = {
  task: Task;
  accountName?: string | null;
  onDelete?: (id: string) => void;
  onToggleDone?: (id: string, done: boolean) => void;
};

export const useTaskCard = ({
  task,
  accountName,
  onDelete,
  onToggleDone,
}: UseTaskCardParams) => {
  const priority = PRIORITY_CONFIG[task.priority];

  const category = useMemo(() => {
    return CATEGORY_CONFIG[task.category] ?? {
      bg: "#f3f4f6",
      text: "#6b7280",
    };
  }, [task.category]);

  const formattedDate = useMemo(() => {
    if (!task.dueDate) return null;

    return format(new Date(task.dueDate), "MMM d");
  }, [task.dueDate]);

  const isDone = task.status === "done";
  const checkboxColor = isDone ? "#007aff" : "#aeb4bf";
  const checkboxLabel = isDone ? "Mark task as not done" : "Complete task";
  const chipName = accountName ?? task.assignee ?? "Google account";

  const handleToggleDone = useCallback(() => {
    onToggleDone?.(task.id, !isDone);
  }, [onToggleDone, task.id, isDone]);

  const handleDelete = useCallback(() => {
    onDelete?.(task.id);
  }, [onDelete, task.id]);

  return {
    priority,
    category,
    formattedDate,
    isDone,
    checkboxColor,
    checkboxLabel,
    chipName,
    handleToggleDone,
    handleDelete,
  };
};