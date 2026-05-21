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
};

export type TaskColumn = {
  id: TaskStatus;
  label: string;
  color: string;
  dotColor: string;
};

export const TASK_COLUMNS: TaskColumn[] = [
  { id: "not_started", label: "Not started", color: "#8f929c", dotColor: "#d1d5db" },
  { id: "in_progress", label: "In progress", color: "#185FA5", dotColor: "#185FA5" },
  { id: "review",      label: "Review",      color: "#d97706", dotColor: "#f59e0b" },
  { id: "done",        label: "Done",        color: "#16a34a", dotColor: "#22c55e" },
];

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  high:   { label: "High",   bg: "#fef2f2", text: "#dc2626" },
  medium: { label: "Medium", bg: "#fff7ed", text: "#d97706" },
  low:    { label: "Low",    bg: "#f0f9ff", text: "#0284c7" },
};

export const CATEGORY_CONFIG: Record<string, { bg: string; text: string }> = {
  Programming: { bg: "#f0fdf4", text: "#16a34a" },
  English:     { bg: "#eff6ff", text: "#2563eb" },
  Math:        { bg: "#faf5ff", text: "#7c3aed" },
  Enjoyment:   { bg: "#fff7ed", text: "#d97706" },
  Test:        { bg: "#fef2f2", text: "#dc2626" },
  Manifolia:   { bg: "#f0fdf4", text: "#059669" },
  Sleep:       { bg: "#f8fafc", text: "#64748b" },
  ごみ:        { bg: "#fafaf9", text: "#78716c" },
};