import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { AnimatedSquareCheckbox } from "@/chip/checkbox/AnimatedSquareCheckbox";
import { useT } from "@/i18n/useT";
import { TASK_COLUMNS } from "./task.types";
import type { Task } from "./task.types";
import { TaskStatusDot } from "../../../chip/icon/TaskStatusDot";

type TaskListViewProps = {
  tasks: Task[];
  onToggleTaskDone: (taskId: string, done: boolean) => void;
  onRenameTask: (taskId: string, title: string) => void;
};

const TABLE_HEADER_CLASS =
  "pb-2 text-left text-[12px] font-medium tracking-normal text-[#b8bcc5]";

const DetailIcon = () => (
  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden="true">
    <path
      d="M4 5.25h10M4 9h10M4 12.75h6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const TaskMoreIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
    <circle cx="8" cy="4" r="1.15" fill="currentColor" />
    <circle cx="8" cy="8" r="1.15" fill="currentColor" />
    <circle cx="8" cy="12" r="1.15" fill="currentColor" />
  </svg>
);

export const TaskListView = ({
  tasks,
  onToggleTaskDone,
  onRenameTask,
}: TaskListViewProps) => {
  const t = useT();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const statusLabelMap = {
    not_started: t.taskStatusNotStarted,
    in_progress: t.taskStatusInProgress,
    review: t.taskStatusReview,
    done: t.taskStatusDone,
  };

  useEffect(() => {
    if (!editingTaskId) {
      return;
    }

    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editingTaskId]);

  const startEditingTaskTitle = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const finishEditingTaskTitle = (task: Task) => {
    const nextTitle = editingTitle.trim();

    if (nextTitle && nextTitle !== task.title) {
      onRenameTask(task.id, nextTitle);
    }

    setEditingTaskId(null);
    setEditingTitle("");
  };

  const cancelEditingTaskTitle = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  return (
    <div className="explorer-chrome-font min-h-0 flex-1 overflow-auto p-4">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#e9eaed]">
            <th className="w-7 pb-2 pr-2 text-left">
              <span className="sr-only">完了</span>
            </th>
            <th className={TABLE_HEADER_CLASS}>タイトル</th>
            <th className={TABLE_HEADER_CLASS}>ステータス</th>
            <th className={TABLE_HEADER_CLASS}>優先度</th>
            <th className={TABLE_HEADER_CLASS}>カテゴリ</th>
            <th className={TABLE_HEADER_CLASS}>期日</th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => {
            const col = TASK_COLUMNS.find((c) => c.id === task.status);
            const isDone = task.status === "done";
            const checkboxColor = isDone ? "#007aff" : "#9ca3af";
            const isEditingTitle = editingTaskId === task.id;

            if (isEditingTitle) {
              return (
                <tr key={task.id} className="border-b border-[#f3f4f6]">
                  <td colSpan={6} className="py-2">
                    <div className="rounded-[18px] border border-[#d7dbe3] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center transition-transform active:scale-90"
                          aria-label={isDone ? "Mark task as not done" : "Complete task"}
                          onClick={() => onToggleTaskDone(task.id, !isDone)}
                        >
                          <AnimatedSquareCheckbox
                            checked={isDone}
                            color={checkboxColor}
                            className="h-5 w-5"
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <input
                            ref={titleInputRef}
                            type="text"
                            value={editingTitle}
                            aria-label="Task title"
                            className="h-7 w-full border-0 bg-transparent p-0 text-[16px] font-medium leading-7 text-[#24262d] outline-none placeholder:text-[#9ca3af]"
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onBlur={() => finishEditingTaskTitle(task)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                finishEditingTaskTitle(task);
                                return;
                              }

                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelEditingTaskTitle();
                              }
                            }}
                          />

                          <div className="mt-1 flex items-center gap-2 text-[13px] font-medium text-[#6b7280]">
                            <DetailIcon />
                            <span>詳細</span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {task.dueDate && (
                              <span className="inline-flex h-8 items-center rounded-full border border-[#d7dbe3] px-3 text-[13px] font-medium text-[#24262d]">
                                {format(new Date(task.dueDate), "MMM d")}
                              </span>
                            )}

                            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#d7dbe3] px-3 text-[13px] font-medium text-[#24262d]">
                              <TaskStatusDot color={col?.dotColor} />
                              {statusLabelMap[task.status]}
                            </span>

                            <span className="inline-flex h-8 items-center rounded-full border border-[#d7dbe3] px-3 text-[13px] font-medium capitalize text-[#24262d]">
                              {task.priority}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#24262d]"
                          aria-label="Task menu"
                        >
                          <TaskMoreIcon />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={task.id}
                className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
              >
                <td className="w-7 py-2.5 pr-2 align-top">
                  <button
                    type="button"
                    className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                    aria-label={isDone ? "Mark task as not done" : "Complete task"}
                    onClick={() => onToggleTaskDone(task.id, !isDone)}
                  >
                    <AnimatedSquareCheckbox checked={isDone} color={checkboxColor} />
                  </button>
                </td>

                <td className="py-2.5 pr-4 font-medium leading-[18px] text-[#24262d]">
                  <button
                    type="button"
                    className="block w-full truncate rounded text-left font-medium leading-[18px] text-[#24262d] transition-colors hover:bg-[#eef6ff] focus-visible:bg-[#eef6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25"
                    aria-label={`Rename ${task.title}`}
                    title="Click to rename"
                    onClick={() => startEditingTaskTitle(task)}
                  >
                    {task.title}
                  </button>
                </td>

                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-1.5 text-[#4c5361]">
                    <TaskStatusDot color={col?.dotColor} />
                    {statusLabelMap[task.status]}
                  </span>
                </td>

                <td className="py-2.5 pr-4 capitalize text-[#4c5361]">
                  {task.priority}
                </td>

                <td className="py-2.5 pr-4 text-[#4c5361]">
                  {task.category}
                </td>

                <td className="py-2.5 text-[#8f929c]">
                  {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
