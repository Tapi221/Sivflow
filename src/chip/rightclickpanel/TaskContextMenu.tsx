import { RIGHT_CLICK_PANEL_MARGIN } from "./rightClickPanelUtils";
import type { Task } from "@/features/calendar/task/task.types";

export type TaskContextMenuUpdatePatch = Partial<Pick<Task, "status" | "priority" | "category" | "dueDate">>;

export type TaskContextMenuCategoryOption = {
  id: string;
  label: string;
};

export const TASK_CONTEXT_MENU_PANEL_ID = "task-context-menu";
export const TASK_CONTEXT_MENU_WIDTH = 0;
export const TASK_CONTEXT_MENU_HEIGHT = 0;
export const TASK_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

export const TaskContextMenu = (_props: Record<string, unknown>) => null;
