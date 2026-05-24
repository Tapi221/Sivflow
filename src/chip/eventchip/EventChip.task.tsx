import { memo } from "react";

import { GoogleAccountChip } from "@/chip/budge/GoogleAccountChip";
import { AnimatedSquareCheckbox } from "@/chip/checkbox/AnimatedSquareCheckbox";
import { TrashIcon } from "@/components/icons/icons.card";
import { CalendarIcon as ScheduleCalendarIcon } from "@/components/icons/icons.schedule";
import type { CalendarColorTokens } from "@/features/calendar/schedule.color-tokens";
import { cn } from "@/lib/utils";

type TaskEventChipProps = {
  title: string;
  categoryLabel: string;
  priorityLabel: string;
  formattedDate?: string | null;
  isDone: boolean;
  checkboxColor: string;
  checkboxLabel: string;
  chipName: string;
  accountPhotoUrl?: string | null;
  tokens: CalendarColorTokens;
  showAssignee?: boolean;
  isDragging?: boolean;
  onDelete?: () => void;
  onToggleDone?: () => void;
};

export const TaskEventChip = memo(({
  title,
  categoryLabel,
  priorityLabel,
  formattedDate,
  isDone,
  checkboxColor,
  checkboxLabel,
  chipName,
  accountPhotoUrl,
  tokens,
  showAssignee = false,
  isDragging = false,
  onDelete,
  onToggleDone,
}: TaskEventChipProps) => {
  const titleLabel = formattedDate
    ? `${formattedDate} ${title}`
    : title;

  return (
    <div
      className={cn(
        `
          group
          relative
          box-border
          flex
          w-full
          max-w-full
          min-w-0
          flex-col
          gap-1
          overflow-hidden
          rounded-md
          px-1.5
          py-1
          text-left
        `,
        "text-[11px] font-medium leading-[1.3]",
        "transition-[filter,box-shadow,opacity] duration-100",
        "hover:brightness-[0.98] hover:shadow-[0_1px_4px_rgba(15,23,42,0.08)]",
        isDone && "opacity-65",
        isDragging
          ? "cursor-grabbing shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
          : "cursor-grab",
      )}
      style={{
        background: tokens.bg,
        borderLeft: `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={titleLabel}
    >
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform active:scale-90"
          aria-label={checkboxLabel}
          title={checkboxLabel}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggleDone?.();
          }}
        >
          <AnimatedSquareCheckbox
            checked={isDone}
            color={checkboxColor}
            className="h-3.5 w-3.5"
          />
        </button>

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[12px] font-medium leading-snug",
            isDone && "line-through opacity-60 decoration-current",
          )}
        >
          {title}
        </span>

        {showAssignee && (
          <span className="shrink-0 rounded-full ring-1 ring-white/80">
            <GoogleAccountChip name={chipName} photoUrl={accountPhotoUrl} />
          </span>
        )}

        {onDelete && (
          <button
            type="button"
            className="-mr-0.5 flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded text-current opacity-0 transition-[background-color,opacity] duration-100 hover:bg-white/55 active:scale-95 group-hover:opacity-70 focus-visible:opacity-70"
            aria-label="タスクを削除"
            title="タスクを削除"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold tabular-nums opacity-80">
        {formattedDate && (
          <span className="inline-flex min-w-0 max-w-[4.85rem] shrink-0 items-center gap-[3px] overflow-hidden truncate">
            <ScheduleCalendarIcon className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">
              {formattedDate}
            </span>
          </span>
        )}

        <span className="min-w-0 flex-1 truncate">
          {categoryLabel}
        </span>

        <span className="shrink-0 opacity-80">
          {priorityLabel}
        </span>
      </div>
    </div>
  );
});

TaskEventChip.displayName = "TaskEventChip";
