import { useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import type { TaskPriority, TaskStatus } from "../task/task.types";
import {
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  TASK_COLUMNS,
} from "../task/task.types";

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

const fieldControlClassName =
  "h-11 min-w-0 flex-1 bg-transparent text-right text-[16px] font-medium text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc] focus:text-[#007aff]";

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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }

    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1d1f]/25 px-4 backdrop-blur-[6px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.18,
        ease: "easeOut",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/70 bg-[#f2f2f7]/95 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
        initial={{
          opacity: 0,
          y: 18,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 12,
          scale: 0.98,
        }}
        transition={{
          duration: 0.26,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {/* ヘッダー */}
        <div className="px-5 pb-3 pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#c7c7cc]" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-[#8e8e93]">
                タスク
              </p>

              <h2 className="mt-0.5 text-[24px] font-bold leading-tight tracking-[-0.03em] text-[#1c1c1e]">
                新しいタスク
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e5e5ea] text-[#8e8e93] transition-colors hover:bg-[#d8d8de]"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* フォーム */}
        <div className="space-y-4 px-5 pb-4">
          {/* タイトル */}
          <section>
            <label className="mb-2 block px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8e8e93]">
              タイトル
            </label>

            <div className="rounded-[18px] bg-white shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.14)]">
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="タスク名を入力..."
                className="h-13 w-full rounded-[18px] bg-transparent px-4 py-3 text-[17px] font-medium tracking-[-0.02em] text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc] focus:shadow-[inset_0_0_0_1px_#007aff]"
              />
            </div>
          </section>

          <section>
            <div className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8e8e93]">
              詳細
            </div>

            <div className="overflow-hidden rounded-[18px] bg-white shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.14)]">
              {/* ステータス */}
              <label className="flex min-h-[52px] items-center gap-4 border-b border-[#e5e5ea]/80 px-4">
                <span className="shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-[#1c1c1e]">
                  ステータス
                </span>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className={`${fieldControlClassName} appearance-none`}
                >
                  {TASK_COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.label}
                    </option>
                  ))}
                </select>

                <span className="text-[20px] leading-none text-[#c7c7cc]" aria-hidden="true">
                  ›
                </span>
              </label>

              {/* 優先度 */}
              <label className="flex min-h-[52px] items-center gap-4 border-b border-[#e5e5ea]/80 px-4">
                <span className="shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-[#1c1c1e]">
                  優先度
                </span>

                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className={`${fieldControlClassName} appearance-none`}
                >
                  {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>

                <span className="text-[20px] leading-none text-[#c7c7cc]" aria-hidden="true">
                  ›
                </span>
              </label>

              {/* カテゴリ */}
              <label className="flex min-h-[52px] items-center gap-4 border-b border-[#e5e5ea]/80 px-4">
                <span className="shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-[#1c1c1e]">
                  カテゴリ
                </span>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${fieldControlClassName} appearance-none`}
                >
                  {Object.keys(CATEGORY_CONFIG).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <span className="text-[20px] leading-none text-[#c7c7cc]" aria-hidden="true">
                  ›
                </span>
              </label>

              {/* 期日 */}
              <label className="flex min-h-[52px] items-center gap-4 px-4">
                <span className="shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-[#1c1c1e]">
                  期日
                </span>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={fieldControlClassName}
                />
              </label>
            </div>
          </section>
        </div>

        {/* フッター */}
        <div className="flex items-center gap-3 bg-[#f2f2f7]/90 px-5 pb-5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-[16px] bg-white text-[16px] font-semibold tracking-[-0.02em] text-[#007aff] shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.14)] transition-colors hover:bg-[#f9f9fb]"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="h-12 flex-1 rounded-[16px] bg-[#007aff] text-[16px] font-semibold tracking-[-0.02em] text-white shadow-[0_8px_20px_rgba(0,122,255,0.28)] transition-all hover:bg-[#0a84ff] disabled:bg-[#c7c7cc] disabled:shadow-none"
          >
            作成
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
