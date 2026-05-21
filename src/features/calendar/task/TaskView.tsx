import { useMemo, useState } from "react";
import { format } from "date-fns";

import { TASK_COLUMNS } from "./task.types";
import type { TaskStatus } from "./task.types";
import { useTaskStore } from "./useTaskStore";
import { TaskColumn } from "./TaskColumn";
import { NewTaskModal } from "./NewTaskModal";

type ViewMode = "board" | "list";

export const TaskView = () => {
  const { tasks, addTask, deleteTask } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [showModal, setShowModal] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("not_started");
  const [filterDate, setFilterDate] = useState<string | null>(
    format(new Date(), "MMM d"),
  );

  const tasksByStatus = useMemo(() => {
    return TASK_COLUMNS.reduce(
      (acc, col) => {
        acc[col.id] = tasks.filter((t) => t.status === col.id);
        return acc;
      },
      {} as Record<string, typeof tasks>,
    );
  }, [tasks]);

  const handleAddTask = (status: string) => {
    setNewTaskStatus(status as TaskStatus);
    setShowModal(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* ツールバー */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#e9eaed] px-4 py-2">
        {/* 左：フィルター群 */}
        <div className="flex items-center gap-2">
          {filterDate && (
            <span className="flex items-center gap-1.5 rounded-full border border-[#e9eaed] bg-white px-2.5 py-1 text-[12px] font-medium text-[#25272d]">
              <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0 text-[#8f929c]">
                <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4.5 1v2M9.5 1v2M1 5.5h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {filterDate}
              <button
                type="button"
                onClick={() => setFilterDate(null)}
                className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#9aa0aa] hover:text-[#4c5361]"
              >
                <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          )}

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-[#e9eaed] bg-white px-2.5 py-1 text-[12px] font-medium text-[#8f929c] transition-colors hover:bg-[#f7f8fa] hover:text-[#25272d]"
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
              <path d="M1.5 4h11M3.5 7h7M5.5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Filter
          </button>
        </div>

        {/* 右：ビュー切替 + New Task */}
        <div className="flex items-center gap-2">
          {/* Board / List 切替 */}
          <div className="flex overflow-hidden rounded-lg border border-[#e9eaed] bg-white">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-[#f0f6ff] text-[#185FA5]"
                  : "text-[#8f929c] hover:bg-[#f7f8fa]"
              }`}
            >
              <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
                <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Board
            </button>
            <div className="w-px bg-[#e9eaed]" />
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-[#f0f6ff] text-[#185FA5]"
                  : "text-[#8f929c] hover:bg-[#f7f8fa]"
              }`}
            >
              <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
                <path d="M1.5 3.5h11M1.5 7h11M1.5 10.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              List
            </button>
          </div>

          {/* 三点メニュー */}
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e9eaed] text-[#8f929c] hover:bg-[#f7f8fa]"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <circle cx="3.5" cy="8" r="1" fill="currentColor" />
              <circle cx="8"   cy="8" r="1" fill="currentColor" />
              <circle cx="12.5" cy="8" r="1" fill="currentColor" />
            </svg>
          </button>

          {/* New Task ボタン */}
          <button
            type="button"
            onClick={() => {
              setNewTaskStatus("not_started");
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#185FA5] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
              <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {viewMode === "board" ? (
        <div className="flex min-h-0 flex-1 gap-3 overflow-auto p-4">
          {TASK_COLUMNS.map((col) => (
            <TaskColumn
              key={col.id}
              column={col}
              tasks={tasksByStatus[col.id] ?? []}
              onAddTask={handleAddTask}
              onDeleteTask={deleteTask}
            />
          ))}
        </div>
      ) : (
        /* リストビュー */
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#e9eaed]">
                <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">タイトル</th>
                <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">ステータス</th>
                <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">優先度</th>
                <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">カテゴリ</th>
                <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">期日</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const col = TASK_COLUMNS.find((c) => c.id === task.status);
                return (
                  <tr key={task.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                    <td className="py-2.5 pr-4 font-medium text-[#1f2329]">{task.title}</td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-1.5 text-[#4c5361]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col?.dotColor }} />
                        {col?.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 capitalize text-[#4c5361]">{task.priority}</td>
                    <td className="py-2.5 pr-4 text-[#4c5361]">{task.category}</td>
                    <td className="py-2.5 text-[#8f929c]">
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 新規タスクモーダル */}
      {showModal && (
        <NewTaskModal
          defaultStatus={newTaskStatus}
          onClose={() => setShowModal(false)}
          onSave={addTask}
        />
      )}
    </div>
  );
};