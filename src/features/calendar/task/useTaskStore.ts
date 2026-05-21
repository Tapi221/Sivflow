import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, TaskPriority, TaskStatus } from "./task.types";

type TaskStore = {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
};

const DEMO_TASKS: Task[] = [
  { id: "t1", title: "AtCoder Weekly Contest", status: "not_started", priority: "high",   category: "Programming", dueDate: "2025-05-13", assignee: "A", createdAt: 1 },
  { id: "t2", title: "レポート課題",             status: "not_started", priority: "medium", category: "English",     dueDate: "2025-05-15", assignee: "A", createdAt: 2 },
  { id: "t3", title: "Union-Findの基本実装",     status: "in_progress", priority: "medium", category: "Programming", dueDate: "2025-05-14", assignee: "A", createdAt: 3 },
  { id: "t4", title: "データ構造の復習",          status: "in_progress", priority: "medium", category: "Programming", dueDate: "2025-05-16", assignee: "A", createdAt: 4 },
  { id: "t5", title: "英単語50個を覚える",        status: "in_progress", priority: "medium", category: "English",     dueDate: "2025-05-18", assignee: "A", createdAt: 5 },
  { id: "t6", title: "プログラミング課題レビュー", status: "review",      priority: "medium", category: "Programming", dueDate: "2025-05-17", assignee: "A", createdAt: 6 },
  { id: "t7", title: "英作文の添削",             status: "review",      priority: "medium", category: "English",     dueDate: "2025-05-18", assignee: "A", createdAt: 7 },
  { id: "t8", title: "ADT演習 問題1-3",          status: "done",        priority: "medium", category: "Programming", dueDate: "2025-05-15", assignee: "A", createdAt: 8 },
  { id: "t9", title: "paiza ランクC問題",         status: "done",        priority: "low",    category: "Programming", dueDate: "2025-05-15", assignee: "A", createdAt: 9 },
  { id: "t10",title: "英語リスニング 30分",       status: "done",        priority: "low",    category: "English",     dueDate: "2025-05-14", assignee: "A", createdAt: 10 },
  { id: "t11",title: "読書（嫌われる勇気）",      status: "done",        priority: "low",    category: "Enjoyment",   dueDate: "2025-05-14", assignee: "A", createdAt: 11 },
  { id: "t12",title: "部屋の掃除",               status: "done",        priority: "low",    category: "ごみ",         dueDate: "2025-05-16", assignee: "A", createdAt: 12 },
];

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: DEMO_TASKS,

      addTask: (data) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            { ...data, id: `task-${Date.now()}`, createdAt: Date.now() },
          ],
        })),

      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      deleteTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

      moveTask: (id, status) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        })),
    }),
    { name: "flashcard-master.tasks.v1" },
  ),
);