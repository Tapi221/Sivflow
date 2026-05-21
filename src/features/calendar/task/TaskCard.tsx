import { format } from "date-fns";
import type { Task } from "./task.types";
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from "./task.types";

type TaskCardProps = {
  task: Task;
  onDelete?: (id: string) => void;
};

const Avatar = ({ name }: { name: string }) => (
  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4c3d9e] text-[10px] font-semibold text-white">
    {name.charAt(0).toUpperCase()}
  </div>
);

export const TaskCard = ({ task, onDelete }: TaskCardProps) => {
  const priority = PRIORITY_CONFIG[task.priority];
  const category = CATEGORY_CONFIG[task.category] ?? { bg: "#f3f4f6", text: "#6b7280" };

  const formattedDate = task.dueDate
    ? format(new Date(task.dueDate), "MMM d")
    : null;

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
          <circle cx="8" cy="8"   r="1" fill="currentColor" />
          <circle cx="8" cy="12.5" r="1" fill="currentColor" />
        </svg>
      </button>

      {/* タイトル */}
      <p className="mb-2 pr-5 text-[13px] font-medium leading-snug text-[#1f2329]">
        {task.title}
      </p>

      {/* タグ行 */}
      <div className="mb-2.5 flex flex-wrap gap-1">
        {/* カテゴリ */}
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
          style={{ background: category.bg, color: category.text }}
        >
          {task.category}
        </span>

        {/* 優先度 */}
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
          style={{ background: priority.bg, color: priority.text }}
        >
          {priority.label}
        </span>
      </div>

      {/* フッター：日付 + アバター */}
      <div className="flex items-center justify-between">
        {formattedDate ? (
          <span className="flex items-center gap-1 text-[11px] text-[#8f929c]">
            <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0">
              <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.5 1v2M9.5 1v2M1 5.5h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {formattedDate}
          </span>
        ) : (
          <span />
        )}

        {task.assignee && <Avatar name={task.assignee} />}
      </div>
    </div>
  );
};