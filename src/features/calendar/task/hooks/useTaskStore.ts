import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, TaskCreateInput, TaskStatus } from "./task.types";

type TaskInsertPosition = "before" | "after";

type TaskStore = {
  tasks: Task[];
  addTask: (task: TaskCreateInput) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  reorderTask: (
    id: string,
    status: TaskStatus,
    overId?: string | null,
    position?: TaskInsertPosition,
  ) => void;
};

const createDemoTask = (
  task: Omit<
    Task,
    | "scheduledStart"
    | "scheduledEnd"
    | "googleCalendarId"
    | "googleEventId"
  >,
): Task => ({
  ...task,
  scheduledStart: null,
  scheduledEnd: null,
  googleCalendarId: null,
  googleEventId: null,
});

const DEMO_TASKS: Task[] = [
  createDemoTask({
    id: "t1",
    title: "AtCoder Weekly Contest",
    status: "not_started",
    priority: "high",
    category: "Programming",
    dueDate: "2025-05-13",
    assignee: "A",
    createdAt: 1,
  }),
  createDemoTask({
    id: "t2",
    title: "レポート課題",
    status: "not_started",
    priority: "medium",
    category: "English",
    dueDate: "2025-05-15",
    assignee: "A",
    createdAt: 2,
  }),
  createDemoTask({
    id: "t3",
    title: "Union-Findの基本実装",
    status: "in_progress",
    priority: "medium",
    category: "Programming",
    dueDate: "2025-05-14",
    assignee: "A",
    createdAt: 3,
  }),
  createDemoTask({
    id: "t4",
    title: "データ構造の復習",
    status: "in_progress",
    priority: "medium",
    category: "Programming",
    dueDate: "2025-05-16",
    assignee: "A",
    createdAt: 4,
  }),
  createDemoTask({
    id: "t5",
    title: "英単語50個を覚える",
    status: "in_progress",
    priority: "medium",
    category: "English",
    dueDate: "2025-05-18",
    assignee: "A",
    createdAt: 5,
  }),
  createDemoTask({
    id: "t6",
    title: "プログラミング課題レビュー",
    status: "review",
    priority: "medium",
    category: "Programming",
    dueDate: "2025-05-17",
    assignee: "A",
    createdAt: 6,
  }),
  createDemoTask({
    id: "t7",
    title: "英作文の添削",
    status: "review",
    priority: "medium",
    category: "English",
    dueDate: "2025-05-18",
    assignee: "A",
    createdAt: 7,
  }),
  createDemoTask({
    id: "t8",
    title: "ADT演習 問題1-3",
    status: "done",
    priority: "medium",
    category: "Programming",
    dueDate: "2025-05-15",
    assignee: "A",
    createdAt: 8,
  }),
  createDemoTask({
    id: "t9",
    title: "paiza ランクC問題",
    status: "done",
    priority: "low",
    category: "Programming",
    dueDate: "2025-05-15",
    assignee: "A",
    createdAt: 9,
  }),
  createDemoTask({
    id: "t10",
    title: "英語リスニング 30分",
    status: "done",
    priority: "low",
    category: "English",
    dueDate: "2025-05-14",
    assignee: "A",
    createdAt: 10,
  }),
  createDemoTask({
    id: "t11",
    title: "読書（嫌われる勇気）",
    status: "done",
    priority: "low",
    category: "Enjoyment",
    dueDate: "2025-05-14",
    assignee: "A",
    createdAt: 11,
  }),
  createDemoTask({
    id: "t12",
    title: "部屋の掃除",
    status: "done",
    priority: "low",
    category: "ごみ",
    dueDate: "2025-05-16",
    assignee: "A",
    createdAt: 12,
  }),
];

const normalizeTask = (task: Task): Task => ({
  ...task,
  scheduledStart: task.scheduledStart ?? null,
  scheduledEnd: task.scheduledEnd ?? null,
  googleCalendarId: task.googleCalendarId ?? null,
  googleEventId: task.googleEventId ?? null,
});

const findLastIndex = <T>(items: T[], predicate: (item: T) => boolean) => {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index;
    }
  }

  return -1;
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: DEMO_TASKS,

      addTask: (data) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...data,
              id: `task-${Date.now()}`,
              createdAt: Date.now(),
              scheduledStart: data.scheduledStart ?? null,
              scheduledEnd: data.scheduledEnd ?? null,
              googleCalendarId: data.googleCalendarId ?? null,
              googleEventId: data.googleEventId ?? null,
            },
          ],
        })),

      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? normalizeTask({ ...task, ...patch }) : normalizeTask(task),
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),

      moveTask: (id, status) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? normalizeTask({ ...task, status }) : normalizeTask(task),
          ),
        })),

      reorderTask: (id, status, overId = null, position = "before") =>
        set((state) => {
          const activeIndex = state.tasks.findIndex((task) => task.id === id);
          const activeTask = activeIndex >= 0 ? state.tasks[activeIndex] : null;

          if (!activeTask) {
            return { tasks: state.tasks };
          }

          const reorderedTask = normalizeTask({ ...activeTask, status });
          const otherTasks = state.tasks
            .filter((task) => task.id !== id)
            .map(normalizeTask);

          let insertIndex = otherTasks.length;

          if (overId) {
            const overIndex = otherTasks.findIndex((task) => task.id === overId);

            if (overIndex >= 0) {
              insertIndex = position === "after" ? overIndex + 1 : overIndex;
            }
          } else {
            const lastSameStatusIndex = findLastIndex(
              otherTasks,
              (task) => task.status === status,
            );
            insertIndex =
              lastSameStatusIndex >= 0 ? lastSameStatusIndex + 1 : otherTasks.length;
          }

          return {
            tasks: [
              ...otherTasks.slice(0, insertIndex),
              reorderedTask,
              ...otherTasks.slice(insertIndex),
            ],
          };
        }),
    }),
    {
      name: "flashcard-master.tasks.v1",
    },
  ),
);