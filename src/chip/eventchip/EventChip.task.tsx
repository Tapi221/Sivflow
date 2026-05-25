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
        "group relative box-border flex w-full max-w-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-l-[4px] border-[#e6e8ee] bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
        "transition-[border-color,box-shadow,opacity,transform,filter] duration-150 ease-[cubic-bezier(.22,1,.36,1)]",
        "hover:-translate-y-px hover:border-[#d8dce5] hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)]",
        isDone && "opacity-70 saturate-75",
        isDragging
          ? "cursor-grabbing shadow-[0_16px_36px_rgba(15,23,42,0.16)] ring-1 ring-black/5"
          : "cursor-grab",
      )}
      style={{ borderLeftColor: tokens.border }}
      title={titleLabel}
    >
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center transition-transform active:scale-90"
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
            className="h-4 w-4"
          />
        </button>

        <span
          className={cn(
            "min-w-0 flex-1 break-words text-[13px] font-semibold leading-[18px] tracking-[-0.01em] text-[#1c1c1e]",
            isDone && "line-through opacity-60 decoration-current decoration-1",
          )}
        >
          {title}
        </span>

        {onDelete && (
          <button
            type="button"
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#9aa0aa] opacity-0 transition-[background-color,color,opacity,transform] duration-150 hover:bg-[#f1f3f6] hover:text-[#5f6673] active:scale-95 group-hover:opacity-100 focus-visible:opacity-100"
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

      <div className="mt-3 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-none tracking-[-0.005em]">
        {formattedDate && (
          <span className="inline-flex h-5 max-w-[5.6rem] shrink-0 items-center gap-1 overflow-hidden rounded-full bg-[#f5f6f8] px-1.5 text-[#7a8290]">
            <ScheduleCalendarIcon className="h-3 w-3 shrink-0" />
            <span className="task-chip-compact-ellipsis min-w-0">
              {formattedDate}
            </span>
          </span>
        )}

        <span
          className="task-chip-compact-ellipsis inline-flex h-5 min-w-0 flex-1 items-center rounded-full px-2"
          style={{ background: tokens.bg, color: tokens.text }}
        >
          {categoryLabel}
        </span>

        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[#f5f6f8] px-2 text-[#7a8290]">
          {priorityLabel}
        </span>

        {showAssignee && (
          <span className="ml-auto shrink-0 rounded-full ring-2 ring-white">
            <GoogleAccountChip name={chipName} photoUrl={accountPhotoUrl} />
          </span>
        )}
      </div>
    </div>
  );
});

TaskEventChip.displayName = "TaskEventChip";
