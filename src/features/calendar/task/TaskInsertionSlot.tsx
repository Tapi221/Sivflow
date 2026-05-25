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
        isActive && "z-20 h-3 -my-0.5",
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "pointer-events-none absolute left-6 right-6 top-1/2 block -translate-y-1/2 border-t border-dashed border-[#aaa39c] transition-[opacity,transform] duration-[160ms] ease-[cubic-bezier(.22,1,.36,1)]",
          isActive ? "scale-x-100 opacity-80" : "scale-x-95 opacity-0",
        )}
      />
    </div>
  );
};
