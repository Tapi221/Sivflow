import { useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { TaskCreateInput, TaskPriority, TaskStatus, TaskSubtask } from "../../features/calendar/task/task.types";
import { CATEGORY_CONFIG, PRIORITY_CONFIG, TASK_COLUMNS } from "../../features/calendar/task/task.types";

type TaskCategoryOption = {
  id: string;
  label: string;
};

type NewTaskModalProps = {
  defaultStatus?: TaskStatus;
  defaultCategory?: string;
  categoryOptions?: TaskCategoryOption[];
  onClose: () => void;
  onSave: (data: TaskCreateInput) => void;
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
  icon?: ReactNode;
  onOpen: (id: string) => void;
  onChange: (value: T) => void;
};

type PriorityToggleProps = {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
};

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
    <path
      d="M3.5 8.3l2.8 2.8 6.2-6.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={`h-3 w-3 text-[#6e6e73] transition-transform ${
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
);

const CircleIcon = () => (
  <span className="h-3 w-3 rounded-full border-2 border-[#8e8e93]" aria-hidden="true" />
);

const CalendarIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
    <path
      d="M4.2 2.5v2M11.8 2.5v2M3 6.4h10M4 3.7h8a1.4 1.4 0 0 1 1.4 1.4v7A1.4 1.4 0 0 1 12 13.5H4A1.4 1.4 0 0 1 2.6 12V5.1A1.4 1.4 0 0 1 4 3.7Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
    <path
      d="M8 3.2v9.6M3.2 8h9.6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
    <path
      d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const NoteIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
    <path
      d="M4.1 3.2h7.8M4.1 6h7.8M4.1 8.8h5.1M3.2 1.8h9.6c.8 0 1.4.6 1.4 1.4v9.6c0 .8-.6 1.4-1.4 1.4H3.2c-.8 0-1.4-.6-1.4-1.4V3.2c0-.8.6-1.4 1.4-1.4Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChecklistIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
    <path
      d="m2.8 4.1 1.1 1.1 2-2.2M7.2 4.1h6M2.8 8l1.1 1.1 2-2.2M7.2 8h6M2.8 11.9 3.9 13l2-2.2M7.2 11.9h6"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PriorityToggle = ({ value, onChange }: PriorityToggleProps) => (
  <div
    role="radiogroup"
    aria-label="優先度"
    className="inline-flex h-8 items-center gap-0.5 rounded-[10px] bg-[#f3f3f5] p-0.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
  >
    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
      const priorityValue = key as TaskPriority;
      const selected = priorityValue === value;

      return (
        <button
          key={priorityValue}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(priorityValue)}
          className={`flex h-7 min-w-[48px] items-center justify-center rounded-[8px] px-3 text-[12px] font-medium transition-all ${
            selected
              ? "bg-white text-[#1f2328] shadow-[0_1px_3px_rgba(0,0,0,0.13)] ring-1 ring-black/[0.08]"
              : "text-[#6e6e73] hover:text-[#3f4247]"
          }`}
        >
          {config.label}
        </button>
      );
    })}
  </div>
);

const IOSPicker = <T extends string,>({
  id,
  title,
  value,
  options,
  isOpen,
  icon,
  onOpen,
  onChange,
}: IOSPickerProps<T>) => {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <div className={`relative ${isOpen ? "z-40" : "z-0"}`}>
      <button
        type="button"
        onClick={() => onOpen(isOpen ? "" : id)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#dedee3] bg-white px-2.5 text-[12px] font-medium text-[#5f6368] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-colors hover:bg-[#f8f8fb] focus:border-[#7c83e6]"
      >
        {icon}
        <span>{selectedLabel}</span>
        <ChevronDownIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 min-w-[200px] rounded-[12px] bg-white p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08]">
          <div className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold tracking-wide text-[#8e8e93]">
            {title}
          </div>

          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[12px] text-[#1f2328] transition-colors hover:bg-[#f2f2f7]"
              >
                <span>{option.label}</span>

                <span className="flex h-3.5 w-3.5 items-center justify-center text-[#6571dc]">
                  {selected && <CheckIcon />}
                </span>
              </button>
            );
          })}
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
  const [description, setDescription] = useState("");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [openPicker, setOpenPicker] = useState("");

  const selectedCategoryLabel =
    resolvedCategoryOptions.find((option) => option.id === category)?.label ??
    CATEGORY_CONFIG[category]?.label ??
    category;

  const handleSave = () => {
    if (!title.trim()) return;

    const normalizedSubtasks = subtasks
      .map((subtask) => ({
        ...subtask,
        title: subtask.title.trim(),
      }))
      .filter((subtask) => subtask.title.length > 0);

    onSave({
      title: title.trim(),
      description: description.trim(),
      subtasks: normalizedSubtasks,
      status,
      priority,
      category,
      dueDate: dueDate || null,
      assignee: "A",
    });

    onClose();
  };

  const addSubtask = () => {
    const trimmedTitle = subtaskDraft.trim();

    if (!trimmedTitle) return;

    setSubtasks((current) => [
      ...current,
      {
        id: `subtask-${Date.now()}-${current.length}`,
        title: trimmedTitle,
        done: false,
      },
    ]);
    setSubtaskDraft("");
  };

  const removeSubtask = (id: string) => {
    setSubtasks((current) => current.filter((subtask) => subtask.id !== id));
  };

  const updateSubtaskTitle = (id: string, value: string) => {
    setSubtasks((current) =>
      current.map((subtask) =>
        subtask.id === id ? { ...subtask, title: value } : subtask,
      ),
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/20 p-6"
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
        className="w-full max-w-[820px] overflow-visible rounded-[18px] bg-white shadow-[0_22px_56px_rgba(0,0,0,0.24)] ring-1 ring-black/[0.08]"
        initial={{
          opacity: 0,
          y: 10,
          scale: 0.98,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 8,
          scale: 0.98,
        }}
        transition={{
          duration: 0.2,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#2f3337]">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#e5e5ea] bg-white px-2.5 text-[#6a6d72] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#dff8ef] text-[9px] text-[#3cbf93]">
                ✓
              </span>
              Task
            </span>
            <span className="text-[#9a9aa0]">›</span>
            <span>New task</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-[#5f6368] transition-colors hover:bg-[#f2f2f7]"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="px-7 pb-8 pt-3">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="タスクタイトル"
            aria-label="タスクタイトル"
            className="w-full border-0 bg-transparent px-0 text-[22px] font-semibold leading-tight tracking-[-0.035em] text-[#1f2328] outline-none placeholder:text-[#a1a1aa]"
          />

          <div className="mt-7 flex flex-wrap items-end gap-2">
            <IOSPicker
              id="status"
              title="ステータス"
              value={status}
              options={TASK_COLUMNS.map((col) => ({
                value: col.id,
                label: col.label,
              }))}
              icon={<CircleIcon />}
              isOpen={openPicker === "status"}
              onOpen={setOpenPicker}
              onChange={(value) => {
                setStatus(value);
                setOpenPicker("");
              }}
            />

            <div className="inline-flex flex-col items-start gap-1">
              <span className="px-1 text-[10px] font-medium text-[#b3b3bb]">優先度</span>
              <PriorityToggle
                value={priority}
                onChange={(value) => {
                  setPriority(value);
                  setOpenPicker("");
                }}
              />
            </div>

            <IOSPicker
              id="category"
              title="カテゴリ"
              value={category}
              options={resolvedCategoryOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              icon={
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[#8e8e93] text-[9px] text-[#6e6e73]">
                  □
                </span>
              }
              isOpen={openPicker === "category"}
              onOpen={setOpenPicker}
              onChange={(value) => {
                setCategory(value);
                setOpenPicker("");
              }}
            />

            <label className="relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#dedee3] bg-white px-2.5 text-[12px] font-medium text-[#5f6368] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f8f8fb]">
              <span className="text-[#6e6e73]">
                <CalendarIcon />
              </span>
              <span>{dueDate || "期日"}</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="期日"
              />
            </label>
          </div>

          <div className="mt-6 overflow-hidden rounded-[18px] bg-white ring-1 ring-black/[0.07]">
            <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
              <section className="p-4 md:p-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7c7f87]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-white text-[#8e8e93] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]">
                    <NoteIcon />
                  </span>
                  詳細
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メモ、背景、完了条件など"
                  aria-label="タスク詳細"
                  rows={5}
                  className="mt-3 min-h-[132px] w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-6 text-[#2f3337] outline-none placeholder:text-[#aeb0b8]"
                />
              </section>

              <section className="border-t border-[#e6e6eb] p-4 md:border-l md:border-t-0 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7c7f87]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-white text-[#8e8e93] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]">
                      <ChecklistIcon />
                    </span>
                    サブタスク
                  </div>

                  {subtasks.length > 0 && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#8e8e93] ring-1 ring-black/[0.04]">
                      {subtasks.length} 件
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  {subtasks.length === 0 && (
                    <div className="rounded-[10px] px-2 py-2.5 text-[12px] leading-5 text-[#a7a9b0]">
                      チェックリストをここに並べられます
                    </div>
                  )}

                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="group flex items-center gap-2 rounded-[10px] px-2 py-1.5 transition-opacity hover:opacity-80"
                    >
                      <span className="h-3.5 w-3.5 shrink-0 rounded-[4px] border border-[#b8bbc4] bg-white" />
                      <input
                        type="text"
                        value={subtask.title}
                        onChange={(e) => updateSubtaskTitle(subtask.id, e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label="サブタスク名"
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-[#2f3337] outline-none placeholder:text-[#b3b3bb]"
                      />
                      <button
                        type="button"
                        onClick={() => removeSubtask(subtask.id)}
                        aria-label="サブタスクを削除"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8e8e93] opacity-0 transition-all hover:text-[#4f5359] group-hover:opacity-100"
                      >
                        <XIcon />
                      </button>
                    </div>
                  ))}

                  <div className="group flex items-center gap-2 rounded-[10px] px-2 py-1.5 transition-opacity hover:opacity-80 focus-within:opacity-100">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dashed border-[#b8bbc4] text-[#8e8e93]">
                      <PlusIcon />
                    </span>
                    <input
                      type="text"
                      value={subtaskDraft}
                      onChange={(e) => setSubtaskDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                          e.preventDefault();
                          addSubtask();
                          return;
                        }

                        handleKeyDown(e);
                      }}
                      placeholder="サブタスクを追加"
                      aria-label="追加するサブタスク"
                      className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-[#2f3337] outline-none placeholder:text-[#aeb0b8]"
                    />
                    {Boolean(subtaskDraft.trim()) && (
                      <button
                        type="button"
                        onClick={addSubtask}
                        className="rounded-full bg-[#1f2328] px-2 py-1 text-[10px] font-semibold text-white shadow-[0_6px_14px_rgba(31,35,40,0.18)] transition-colors hover:bg-[#343942]"
                      >
                        追加
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] text-[#8e8e93] ring-1 ring-black/[0.04]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6571dc]" />
            <span>
              <span className="font-medium text-[#5f6368]">{selectedCategoryLabel}</span> に作成されます
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#ededf0] px-5 py-4">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dedee3] bg-white text-[#6e6e73] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f8f8fb]"
            aria-label="添付"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path
                d="M5.2 8.4 8.6 5a2.1 2.1 0 0 1 3 3L7.3 12.3a3.2 3.2 0 0 1-4.5-4.5l4.7-4.7a4 4 0 0 1 5.7 5.7L8.6 13.4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[#5f6368] transition-colors hover:bg-[#f2f2f7]"
            >
              キャンセル
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="rounded-full bg-[#6571dc] px-4 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_18px_rgba(101,113,220,0.28)] transition-colors hover:bg-[#5864ce] disabled:bg-[#c7c7cc] disabled:shadow-none"
            >
              作成
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
