export type TaskStatus = "not_started" | "in_progress" | "review" | "done";
export type TaskPriority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate: string | null;
  assignee: string | null;
  createdAt: number;

  scheduledStart: string | null;
  scheduledEnd: string | null;
  googleCalendarId: string | null;
  googleEventId: string | null;
};

export type TaskCreateInput = {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate: string | null;
  assignee: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  googleCalendarId?: string | null;
  googleEventId?: string | null;
};

export type TaskColumn = {
  id: TaskStatus;
  label: string;
  color: string;
  dotColor: string;
};

export type TaskVisualConfig = {
  label: string;
  bg: string;
  text: string;
};

export const TASK_COLUMNS: TaskColumn[] = [
  { id: "not_started", label: "未着手", color: "#8f929c", dotColor: "#d1d5db" },
  { id: "in_progress", label: "進行中", color: "#185FA5", dotColor: "#185FA5" },
  { id: "review", label: "レビュー", color: "#d97706", dotColor: "#f59e0b" },
  { id: "done", label: "完了", color: "#16a34a", dotColor: "#22c55e" },
];

export const PRIORITY_CONFIG: Record<TaskPriority, TaskVisualConfig> = {
  high: { label: "高", bg: "#fef2f2", text: "#dc2626" },
  medium: { label: "中", bg: "#fff7ed", text: "#d97706" },
  low: { label: "低", bg: "#f0f9ff", text: "#0284c7" },
};

export const CATEGORY_CONFIG: Record<string, TaskVisualConfig> = {
  Programming: { label: "プログラミング", bg: "#f0fdf4", text: "#16a34a" },
  English: { label: "英語", bg: "#eff6ff", text: "#2563eb" },
  Math: { label: "数学", bg: "#faf5ff", text: "#7c3aed" },
  Enjoyment: { label: "趣味", bg: "#fff7ed", text: "#d97706" },
  Test: { label: "テスト", bg: "#fef2f2", text: "#dc2626" },
  Manifolia: { label: "Manifolia", bg: "#f0fdf4", text: "#059669" },
  Sleep: { label: "睡眠", bg: "#f8fafc", text: "#64748b" },
  ごみ: { label: "ごみ", bg: "#fafaf9", text: "#78716c" },
};