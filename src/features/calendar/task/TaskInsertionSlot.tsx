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
        isActive && "z-20 h-4 -my-0.5",
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "pointer-events-none absolute left-2 right-2 top-1/2 -translate-y-1/2 rounded-full transition-[opacity,transform,box-shadow,background-color] duration-[160ms] ease-[cubic-bezier(.22,1,.36,1)]",
          isActive
            ? "h-2.5 scale-x-100 bg-[#f7f5f2] opacity-100 shadow-[inset_0_0_0_1px_rgba(148,139,129,0.16),0_1px_3px_rgba(15,23,42,0.04)]"
            : "h-2.5 scale-x-95 bg-transparent opacity-0",
        )}
      >
        <span
          className={cn(
            "absolute left-4 right-4 top-1/2 block -translate-y-1/2 border-t border-dashed border-[#aaa39c] transition-opacity duration-[160ms]",
            isActive ? "opacity-80" : "opacity-0",
          )}
        />
      </div>
    </div>
  );
};
