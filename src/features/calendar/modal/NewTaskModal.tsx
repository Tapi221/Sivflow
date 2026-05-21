import { useState } from "react";
import type { TaskPriority, TaskStatus } from "../task/task.types";
import { TASK_COLUMNS, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../task/task.types";

type NewTaskModalProps = {
  defaultStatus?: TaskStatus;
  onClose: () => void;
  onSave: (data: {
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    category: string;
    dueDate: string | null;
    assignee: string | null;
  }) => void;
};

export const NewTaskModal = ({
  defaultStatus = "not_started",
  onClose,
  onSave,
}: NewTaskModalProps) => {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState("Programming");
  const [dueDate, setDueDate] = useState("");

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      status,
      priority,
      category,
      dueDate: dueDate || null,
      assignee: "A",
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[480px] rounded-2xl border border-[#e9eaed] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-[#f3f4f6] px-5 py-4">
          <h2 className="text-[14px] font-semibold text-[#1f2329]">新しいタスク</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#b0b4be] hover:bg-[#f3f4f6]"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <div className="flex flex-col gap-4 p-5">
          {/* タイトル */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
              タイトル
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="タスク名を入力..."
              className="w-full rounded-lg border border-[#e9eaed] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#1f2329] outline-none placeholder:text-[#c5c8d0] focus:border-[#193a5c] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* ステータス */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
                ステータス
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-[#e9eaed] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#1f2329] outline-none focus:border-[#193a5c]"
              >
                {TASK_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
              </select>
            </div>

            {/* 優先度 */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
                優先度
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-[#e9eaed] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#1f2329] outline-none focus:border-[#193a5c]"
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            {/* カテゴリ */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
                カテゴリ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#e9eaed] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#1f2329] outline-none focus:border-[#193a5c]"
              >
                {Object.keys(CATEGORY_CONFIG).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 期日 */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
                期日
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-[#e9eaed] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#1f2329] outline-none focus:border-[#193a5c]"
              />
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-2 border-t border-[#f3f4f6] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-[13px] font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="rounded-lg bg-[#193a5c] px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
};