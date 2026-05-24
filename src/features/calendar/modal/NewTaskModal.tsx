import { useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { TaskPriority, TaskStatus } from "../task/task.types";
import {
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  TASK_COLUMNS,
} from "../task/task.types";

type TaskCategoryOption = {
  id: string;
  label: string;
};

type NewTaskModalProps = {
  defaultStatus?: TaskStatus;
  defaultCategory?: string;
  categoryOptions?: TaskCategoryOption[];
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

type PickerOption<T extends string> = {
  value: T;
  label: string;
};

type IOSPickerProps<T extends string> = {
  id: string;
  title: string;
  value: T;
  options: PickerOption<T>[];
  isOpen: boolean;
  onOpen: (id: string) => void;
  onChange: (value: T) => void;
};

const IOSPicker = <T extends string,>({
  id,
  title,
  value,
  options,
  isOpen,
  onOpen,
  onChange,
}: IOSPickerProps<T>) => {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <div className={`relative ${isOpen ? "z-30" : "z-0"}`}>
      <button
        type="button"
        onClick={() => onOpen(isOpen ? "" : id)}
        className="flex w-full items-center justify-between rounded-lg border border-[#e5e5ea] bg-white px-3 py-2 text-left text-[13px] text-[#1c1c1e] outline-none transition-colors hover:bg-[#fbfbfd] focus:border-[#007aff] focus:bg-white"
      >
        <span>{selectedLabel}</span>

        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`h-4 w-4 text-[#1c1c1e] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 rounded-[12px] bg-white px-2 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08]">
          <span
            className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-white ring-1 ring-black/[0.05]"
            aria-hidden="true"
          />

          <div className="relative mb-1 px-2 text-[11px] font-semibold tracking-wide text-[#8e8e93]">
            {title}
          </div>

          <div className="relative">
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className="flex w-full items-center justify-between rounded-[8px] px-2 py-2 text-left text-[13px] text-[#1c1c1e] transition-colors hover:bg-[#f2f2f7]"
                >
                  <span>{option.label}</span>

                  <span className="flex h-4 w-4 items-center justify-center text-[#007aff]">
                    {selected && (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path
                          d="M3.5 8.3l2.8 2.8 6.2-6.2"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const NewTaskModal = ({
  defaultStatus = "not_started",
  defaultCategory = "Programming",
  categoryOptions,
  onClose,
  onSave,
}: NewTaskModalProps) => {
  const resolvedCategoryOptions = categoryOptions?.length
    ? categoryOptions
    : Object.entries(CATEGORY_CONFIG).map(([key, val]) => ({
        id: key,
        label: val.label,
      }));
  const initialCategory = resolvedCategoryOptions.some(
    (option) => option.id === defaultCategory,
  )
    ? defaultCategory
    : resolvedCategoryOptions[0]?.id ?? "Programming";

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState(initialCategory);
  const [dueDate, setDueDate] = useState("");
  const [openPicker, setOpenPicker] = useState("");

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

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/10 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.16,
        ease: "easeOut",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-[480px] rounded-[14px] bg-white shadow-[0_18px_42px_rgba(0,0,0,0.20)] ring-1 ring-black/[0.08]"
        initial={{
          opacity: 0,
          scale: 0.94,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          scale: 0.96,
        }}
        transition={{
          duration: 0.18,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-[#ededf0] px-5 py-4">
          <h2 className="text-[var(--ds-typography-font-size-sm)] font-semibold tracking-[-0.02em] text-[#1c1c1e]">
            新しいタスク
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-[#6e6e73] transition-colors hover:bg-[#f2f2f7]"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <div className="flex flex-col gap-4 p-5">
          {/* タイトル */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
              タイトル
            </label>

            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="タスク名を入力..."
              className="w-full rounded-lg border border-[#e5e5ea] bg-white px-3 py-2 text-[13px] text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc] transition-colors focus:border-[#007aff] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* ステータス */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
                ステータス
              </label>

              <IOSPicker
                id="status"
                title="ステータス"
                value={status}
                options={TASK_COLUMNS.map((col) => ({
                  value: col.id,
                  label: col.label,
                }))}
                isOpen={openPicker === "status"}
                onOpen={setOpenPicker}
                onChange={(value) => {
                  setStatus(value);
                  setOpenPicker("");
                }}
              />
            </div>

            {/* 優先度 */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
                優先度
              </label>

              <IOSPicker
                id="priority"
                title="優先度"
                value={priority}
                options={Object.entries(PRIORITY_CONFIG).map(([key, val]) => ({
                  value: key as TaskPriority,
                  label: val.label,
                }))}
                isOpen={openPicker === "priority"}
                onOpen={setOpenPicker}
                onChange={(value) => {
                  setPriority(value);
                  setOpenPicker("");
                }}
              />
            </div>

            {/* カテゴリ */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
                カテゴリ
              </label>

              <IOSPicker
                id="category"
                title="カテゴリ"
                value={category}
                options={resolvedCategoryOptions.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                isOpen={openPicker === "category"}
                onOpen={setOpenPicker}
                onChange={(value) => {
                  setCategory(value);
                  setOpenPicker("");
                }}
              />
            </div>

            {/* 期日 */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
                期日
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-[#e5e5ea] bg-white px-3 py-2 text-[13px] text-[#1c1c1e] outline-none transition-colors focus:border-[#007aff] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-2 border-t border-[#ededf0] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-[13px] font-medium text-[#007aff] transition-colors hover:bg-[#f2f2f7]"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="rounded-lg bg-[#007aff] px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0a84ff] disabled:bg-[#c7c7cc]"
          >
            作成
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
