import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";

import type { TaskColumn as TaskColumnType } from "./task.types";

type TaskInsertionSlotProps = {
  status: TaskColumnType["id"];
  insertIndex: number;
  overTaskId?: string | null;
  isFirst?: boolean;
};

export const TaskInsertionSlot = ({
  status,
  insertIndex,
  overTaskId = null,
  isFirst = false,
}: TaskInsertionSlotProps) => {
  const { setNodeRef } = useDroppable({
    id: `task-slot:${status}:${insertIndex}`,
    data: {
      type: "task-slot",
      status,
      insertIndex,
      overTaskId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative z-0 shrink-0",
        isFirst ? "h-4 -mb-1" : "h-6 -my-2",
      )}
      aria-hidden="true"
    />
  );
};
