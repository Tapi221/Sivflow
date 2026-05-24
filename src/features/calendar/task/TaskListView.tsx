import { useMemo, useState } from "react";
import { TaskPriorityBadge } from "@/chip/budge/TaskPriorityBadge";
import { AnimatedSquareCheckbox } from "@/chip/checkbox/AnimatedSquareCheckbox";
import { TrashIcon } from "@/components/icons/icons.card";
import { CATEGORY_CONFIG, TASK_COLUMNS } from "./task.types";
import type { Task, TaskGroupMode, TaskStatus } from "./task.types";

type TaskListViewProps = {
  tasks: Task[];
  groupMode: TaskGroupMode;
  onToggleTaskDone: (taskId: string, done: boolean) => void;
  onRenameTask: (taskId: string, title: string) => void;
  onChangeTaskDueDate?: (taskId: string, dueDate: string | null) => void;
  onDeleteTask: (taskId: string) => void;
};

type TaskGroup = {
  id: string;
  label: string;
  tasks: Task[];
  color?: string;
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  review: "レビュー",
  done: "完了",
};

const getCategoryConfig = (category: string) => {
  return (
    CATEGORY_CONFIG[category] ?? {
      label: category,
      bg: "#f3f4f6",
      text: "#6b7280",
    }
  );
};

export const TaskListView = ({
  tasks,
  groupMode,
  onToggleTaskDone,
  onRenameTask,
  onChangeTaskDueDate,
  onDeleteTask,
}: TaskListViewProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const grouped = useMemo<TaskGroup[]>(() => {
    if (groupMode === "status") {
      return TASK_COLUMNS.map((column) => ({
        id: column.id,
        label: STATUS_LABEL[column.id],
        tasks: tasks.filter((task) => task.status === column.id),
        color: column.color,
      }));
    }

    const sectionGroups = new Map<string, TaskGroup>();

    tasks.forEach((task) => {
      const category = getCategoryConfig(task.category);
      const existing = sectionGroups.get(task.category);

      if (existing) {
        existing.tasks.push(task);
        return;
      }

      sectionGroups.set(task.category, {
        id: task.category,
        label: category.label,
        tasks: [task],
        color: category.text,
      });
    });

    return Array.from(sectionGroups.values());
  }, [groupMode, tasks]);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const finishEdit = (task: Task) => {
    const nextTitle = editingTitle.trim();
    if (nextTitle && nextTitle !== task.title) {
      onRenameTask(task.id, nextTitle);
    }
    setEditingId(null);
    setEditingTitle("");
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      <div className="sticky top-0 z-20 grid min-w-[900px] grid-cols-[32px_minmax(260px,1fr)_96px_160px_150px_40px] border-b border-[#eeeeee] bg-white text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8f929c]">
        <div className="h-8" />
        <div className="flex h-8 items-center pr-3">タイトル</div>
        <div className="flex h-8 items-center pr-3">優先度</div>
        <div className="flex h-8 items-center pr-3">カテゴリ</div>
        <div className="flex h-8 items-center pr-3">期日</div>
        <div className="h-8" />
      </div>

      <div className="min-w-[900px]">
        {grouped.length === 0 ? (
          <div className="grid grid-cols-[32px_minmax(260px,1fr)_96px_160px_150px_40px] border-b border-[#f5f5f5]">
            <div />
            <div className="py-2 pr-3 text-[12px] italic text-[#c7c7cc]">タスクなし</div>
            <div />
            <div />
            <div />
            <div />
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.id}>
              <div className="grid grid-cols-[32px_minmax(260px,1fr)_96px_160px_150px_40px] border-b border-[#f0f0f0] bg-white">
                <div />
                <div className="flex items-center gap-2 py-2 pr-3 text-[12px] font-semibold text-[#8f929c]">
                  {groupMode === "section" && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: group.color ?? "#8f929c" }}
                    />
                  )}
                  {group.label}
                  <span className="text-[11px] font-medium text-[#b0b4be]">{group.tasks.length}</span>
                </div>
                <div />
                <div />
                <div />
                <div />
              </div>

              {group.tasks.length === 0 ? (
                <div className="grid grid-cols-[32px_minmax(260px,1fr)_96px_160px_150px_40px] border-b border-[#f5f5f5]">
                  <div />
                  <div className="py-2 pr-3 text-[12px] italic text-[#c7c7cc]">タスクなし</div>
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              ) : (
                group.tasks.map((task) => {
                  const isDone = task.status === "done";
                  const category = getCategoryConfig(task.category);

                  return (
                    <div
                      key={task.id}
                      className={`group/row grid grid-cols-[32px_minmax(260px,1fr)_96px_160px_150px_40px] border-b border-[#f5f5f5] transition-colors hover:bg-[#fafafa] ${isDone ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          aria-label={isDone ? "未完了に戻す" : "完了にする"}
                          onClick={() => onToggleTaskDone(task.id, !isDone)}
                          className="flex h-3.5 w-3.5 items-center justify-center opacity-40 transition-opacity group-hover/row:opacity-100"
                        >
                          <AnimatedSquareCheckbox
                            checked={isDone}
                            color={isDone ? "#007aff" : "#9ca3af"}
                            className="h-3.5 w-3.5"
                          />
                        </button>
                      </div>

                      <div className="flex min-w-0 items-center py-[9px] pr-3">
                        {editingId === task.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onBlur={() => finishEdit(task)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                finishEdit(task);
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                setEditingId(null);
                                setEditingTitle("");
                              }
                            }}
                            className="w-full border-0 bg-transparent p-0 text-[13px] font-medium text-[#1c1c1e] outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(task)}
                            className={`-mx-1 w-full truncate rounded px-1 text-left text-[13px] font-medium hover:bg-[#f4f5f7] ${isDone ? "text-[#8e8e93] line-through" : "text-[#1c1c1e]"}`}
                          >
                            {task.title}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center py-[9px] pr-3">
                        <TaskPriorityBadge priority={task.priority} />
                      </div>

                      <div className="flex items-center py-[9px] pr-3">
                        <span
                          className="inline-flex h-5 max-w-full items-center truncate rounded-full px-2 text-[11px] font-medium"
                          style={{ backgroundColor: category.bg, color: category.text }}
                        >
                          {category.label}
                        </span>
                      </div>

                      <div className="flex items-center py-[7px] pr-3">
                        <input
                          type="date"
                          value={task.dueDate ?? ""}
                          onChange={(event) => {
                            onChangeTaskDueDate?.(task.id, event.target.value || null);
                          }}
                          className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-[12px] text-[#8f929c] outline-none hover:border-[#e5e7eb] hover:bg-white focus:border-[#007aff] focus:bg-white focus:text-[#1c1c1e]"
                        />
                      </div>

                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          aria-label="タスクを削除"
                          onClick={() => onDeleteTask(task.id)}
                          className="flex h-5 w-5 items-center justify-center rounded text-[#c7c7cc] opacity-0 hover:bg-[#fee2e2] hover:text-[#ff3b30] group-hover/row:opacity-100"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
};
