import { format } from "date-fns";
import { GoogleAccountChip } from "@/features/calendar/chip/GoogleAccountChip";
import { TaskPriorityBadge } from "@/features/calendar/chip/TaskPriorityBadge";
import { CheckSquareFilledIcon, SquareOutlineIcon} from "@/icons/schedule.icons";
import { CATEGORY_CONFIG } from "./task.types";
import type { Task } from "./task.types";
// ==============================================

type TaskCardProps = {
  task: Task;
  onDelete?: (id: string) => void;
  onToggleDone?: (id: string, done: boolean) => void;
};

export const TaskCard = ({ task, onDelete, onToggleDone }: TaskCardProps) => {
  const isDone = task.status === "done";

  let category = CATEGORY_CONFIG[task.category];
  if (!category) {
    category = { bg: "#f3f4f6", text: "#6b7280" };
  }

  let formattedDate: string | null = null;
  if (task.dueDate) {
    formattedDate = format(new Date(task.dueDate), "MMM d");
  }

  let titleClassName =
    "min-w-0 text-[13px] font-medium leading-snug text-[#1f2329]";
  if (isDone) {
    titleClassName =
      "min-w-0 text-[13px] font-medium leading-snug text-[#9aa0aa] line-through";
  }

  let checkboxLabel = "Mark task as done";
  if (isDone) {
    checkboxLabel = "Mark task as not started";
  }

  let checkboxIcon = (
    <SquareOutlineIcon className="h-[16.8px] w-[16.8px] text-[#d1d5db]" />
  );
  if (isDone) {
    checkboxIcon = (
      <CheckSquareFilledIcon className="h-3.5 w-3.5 text-[#4b36a8]" />
    );
  }

  const handleToggleDone = () => {
    onToggleDone?.(task.id, !isDone);
  };

  let dateContent = <span />;
  if (formattedDate) {
    dateContent = (
      <span className="flex items-center gap-1 text-[11px] text-[#8f929c]">
        <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0">
          <rect
            x="1"
            y="2"
            width="12"
            height="11"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M4.5 1v2M9.5 1v2M1 5.5h12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        {formattedDate}
      </span>
    );
  }

  return (
    <div className="group relative rounded-lg border border-[#e9eaed] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      {/* 三点メニュー */}
      <button
        type="button"
        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded text-[#b0b4be] hover:bg-[#f3f4f6] hover:text-[#4c5361] group-hover:flex"
        aria-label="More options"
        onClick={() => onDelete?.(task.id)}
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <circle cx="8" cy="3.5" r="1" fill="currentColor" />
          <circle cx="8" cy="8" r="1" fill="currentColor" />
          <circle cx="8" cy="12.5" r="1" fill="currentColor" />
        </svg>
      </button>

      {/* タイトル + チェックボックス */}
      <div className="mb-2 flex items-start gap-2 pr-5">
        <button
          type="button"
          aria-label={checkboxLabel}
          aria-pressed={isDone}
          className="mt-[1px] flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded"
          onClick={handleToggleDone}
        >
          {checkboxIcon}
        </button>

        <p className={titleClassName}>{task.title}</p>
      </div>

      {/* タグ行 */}
      <div className="mb-2.5 flex flex-wrap gap-1">
        {/* カテゴリ */}
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
          style={{
            background: category.bg,
            color: category.text,
          }}
        >
          {task.category}
        </span>

        <TaskPriorityBadge priority={task.priority} />
      </div>

      {/* フッター：日付 + Googleアカウント */}
      <div className="flex items-center justify-between">
        {dateContent}
        {task.assignee && <GoogleAccountChip name={task.assignee} />}
      </div>
    </div>
  );
};