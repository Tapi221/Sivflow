import { GoogleAccountChip } from "@/chip/budge/GoogleAccountChip";
import { cn } from "@/lib/utils";

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

const TASK_CARD_META_ITEM_CLASS_NAME =
  "inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[15px] font-medium leading-none tracking-[-0.01em] text-[#7f7f7f]";

const TaskCompletionIcon = ({
  checked,
  className,
}: {
  checked: boolean;
  className?: string;
}) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {checked ? (
      <>
        <circle cx="20" cy="20" r="19" fill="#a6a6a6" />
        <path
          d="M11.75 20.55L17.1 25.9L28.4 14.6"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <circle cx="20" cy="20" r="17.5" stroke="#a6a6a6" strokeWidth="3" />
    )}
  </svg>
);

const TaskMenuIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="8" cy="4" r="1.15" fill="currentColor" />
    <circle cx="8" cy="8" r="1.15" fill="currentColor" />
    <circle cx="8" cy="12" r="1.15" fill="currentColor" />
  </svg>
);

const TaskDateIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect
      x="4"
      y="5"
      width="16"
      height="15"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8 3.75V7M16 3.75V7M8 10.5H16M8 14H8.01M12 14H12.01M16 14H16.01M8 17H8.01M12 17H12.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TaskPriorityIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M5 6.75C5 5.23 6.23 4 7.75 4H16.25C17.77 4 19 5.23 19 6.75V12.25C19 13.77 17.77 15 16.25 15H11.5L7.25 19V15H7.75C6.23 15 5 13.77 5 12.25V6.75Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TaskTagIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M4.75 11.35L11.35 4.75H17.25L19.25 6.75V12.65L12.65 19.25C11.95 19.95 10.8 19.95 10.1 19.25L4.75 13.9C4.05 13.2 4.05 12.05 4.75 11.35Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="15.75" cy="8.25" r="1.25" fill="currentColor" />
  </svg>
);

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

  return (
    <div
      className={cn(
        "group relative min-h-[112px] overflow-hidden rounded-[22px] border border-[#e2e2e2] bg-white px-5 py-5",
        "shadow-[0_1px_3px_rgba(15,23,42,0.08)]",
        "transition-[transform,background-color,border-color,box-shadow,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
        "hover:border-[#d6d6d6] hover:shadow-[0_8px_22px_rgba(15,23,42,0.10)]",
        "active:scale-[0.998]",
        isDragging
          ? "cursor-grabbing scale-[1.015] border-[#d4d4d4] shadow-[0_18px_48px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.04]"
          : "cursor-grab",
      )}
    >
      <div className="flex min-w-0 items-start gap-4 pr-8">
        <button
          type="button"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
          aria-label={checkboxLabel}
          title={checkboxLabel}
          onClick={handleToggleDone}
        >
          <TaskCompletionIcon checked={isDone} className="h-8 w-8" />
        </button>

        <div className="min-w-0 flex-1 pt-1">
          <div
            className={cn(
              "min-w-0 truncate text-[19px] font-medium leading-[1.18] tracking-[-0.03em] text-[#343434]",
              isDone &&
                "text-[#777777] line-through decoration-[#8e8e8e] decoration-[1.5px] underline-offset-2",
            )}
          >
            {task.title}
          </div>

          <div
            className={cn(
              "mt-7 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2",
              task.assignee && "pr-8",
            )}
          >
            {formattedDate && (
              <span className={TASK_CARD_META_ITEM_CLASS_NAME}>
                <TaskDateIcon className="h-5 w-5 shrink-0" />
                <span>{formattedDate}</span>
              </span>
            )}

            <span className={TASK_CARD_META_ITEM_CLASS_NAME}>
              <TaskPriorityIcon className="h-5 w-5 shrink-0" />
              <span>{priority.label}</span>
            </span>

            <span className={TASK_CARD_META_ITEM_CLASS_NAME}>
              <TaskTagIcon className="h-5 w-5 shrink-0" />
              <span className="truncate">{task.category}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1">
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8a8a8a] opacity-0 transition-[background-color,color,opacity,transform] hover:bg-[#f1f1f1] hover:text-[#555555] active:scale-90 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Task menu"
          onClick={handleDelete}
        >
          <TaskMenuIcon className="h-4 w-4" />
        </button>
      </div>

      {task.assignee && (
        <div className="pointer-events-none absolute right-5 bottom-4 rounded-full ring-2 ring-white">
          <GoogleAccountChip name={chipName} photoUrl={accountPhotoUrl} />
        </div>
      )}
    </div>
  );
};