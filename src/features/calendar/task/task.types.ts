export type TaskStatus = "not_started" | "in_progress" | "review" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type TaskGroupMode = "status" | "section";

export type TaskSubtask = {
  id: string;
  title: string;
  done: boolean;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  subtasks: TaskSubtask[];
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
  description?: string;
  subtasks?: TaskSubtask[];
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
  { id: "in_progress", label: "進行中", color: "#4f7ea6", dotColor: "#8fb6d8" },
  { id: "review", label: "レビュー", color: "#b7793c", dotColor: "#e8b878" },
  { id: "done", label: "完了", color: "#5f9b73", dotColor: "#a8d7b2" },
];

export const PRIORITY_CONFIG: Record<TaskPriority, TaskVisualConfig> = {
  high: { label: "高", bg: "#fff5f5", text: "#b77979" },
  medium: { label: "中", bg: "#fff8f0", text: "#b88955" },
  low: { label: "低", bg: "#f3f9fd", text: "#5d8fb3" },
};

export const CATEGORY_CONFIG: Record<string, TaskVisualConfig> = {
  Programming: { label: "プログラミング", bg: "#f3faf5", text: "#4f9a68" },
  English: { label: "英語", bg: "#f5f8ff", text: "#5f7fba" },
  Math: { label: "数学", bg: "#faf7ff", text: "#8a72b8" },
  Enjoyment: { label: "趣味", bg: "#fff8f2", text: "#b88955" },
  Test: { label: "テスト", bg: "#fff5f5", text: "#b77979" },
  Manifolia: { label: "Manifolia", bg: "#f3faf7", text: "#4f967f" },
  Sleep: { label: "睡眠", bg: "#f8fafc", text: "#7a8694" },
  ごみ: { label: "ごみ", bg: "#fafaf9", text: "#8a8580" },
};
