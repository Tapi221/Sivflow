import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";

type TaskInsertionSlotProps = {
  columnId: string;
  insertIndex: number;
  overTaskId?: string | null;
  isFirst?: boolean;
  isLast?: boolean;
  isActive?: boolean;
};

export const TaskInsertionSlot = ({
  columnId,
  insertIndex,
  overTaskId = null,
  isFirst = false,
  isLast = false,
  isActive = false,
}: TaskInsertionSlotProps) => {
  const { setNodeRef } = useDroppable({
    id: `task-slot:${columnId}:${insertIndex}`,
    data: {
      type: "task-slot",
      columnId,
      insertIndex,
      overTaskId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative z-0 shrink-0 transition-[height,margin,opacity] duration-[160ms] ease-[cubic-bezier(.22,1,.36,1)]",
        isFirst ? "h-4 -mb-1" : isLast ? "h-4 -mt-2 -mb-2" : "h-6 -my-2",
        isActive && "z-20 h-6 -my-1",
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full transition-[height,opacity,transform,box-shadow] duration-[160ms] ease-[cubic-bezier(.22,1,.36,1)]",
          isActive
            ? "h-[3px] scale-x-100 bg-[#007aff] opacity-100 shadow-[0_0_0_3px_rgba(0,122,255,0.12)]"
            : "h-px scale-x-95 bg-transparent opacity-0",
        )}
      />
    </div>
  );
};
