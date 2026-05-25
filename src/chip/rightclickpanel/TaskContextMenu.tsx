import { type CSSProperties, type RefObject } from "react";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_MARGIN, type RightClickPanelId } from "./rightClickPanelUtils";
import { CATEGORY_CONFIG, PRIORITY_CONFIG, TASK_COLUMNS, type Task, type TaskPriority } from "@/features/calendar/task/task.types";

export type TaskContextMenuUpdatePatch = Partial<Pick<Task, "status" | "priority" | "category" | "dueDate">>;

export type TaskContextMenuCategoryOption = {
  id: string;
  label: string;
};

type TaskContextMenuProps = {
  x: number;
  y: number;
  task: Task;
  categoryOptions: TaskContextMenuCategoryOption[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  panelId?: RightClickPanelId;
  onClose: () => void;
  onUpdateTask: (taskId: string, patch: TaskContextMenuUpdatePatch) => void;
  onDeleteTask: (taskId: string) => void;
};

type TaskContextChoiceProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

const TASK_CONTEXT_PANEL_ID = "task-context-menu";
const TASK_CONTEXT_MENU_PRIORITY_ORDER: TaskPriority[] = ["high", "medium", "low"];
const TASK_CONTEXT_MENU_FALLBACK_CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([id, config]) => ({ id, label: config.label }));

export const TASK_CONTEXT_MENU_PANEL_ID = TASK_CONTEXT_PANEL_ID;
export const TASK_CONTEXT_MENU_WIDTH = 292;
export const TASK_CONTEXT_MENU_HEIGHT = 392;
export const TASK_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const TASK_CONTEXT_MENU_STYLE = `
.task-context-menu {
  padding: 6px;
  max-height: min(${TASK_CONTEXT_MENU_HEIGHT}px, calc(100vh - ${TASK_CONTEXT_MENU_MARGIN * 2}px));
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(31, 41, 55, 0.1);
  border-radius: 12px;
  box-shadow:
    0 18px 44px rgba(15, 23, 42, 0.16),
    0 3px 10px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  color: #1f2937;
  backdrop-filter: blur(18px) saturate(1.25);
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.54) transparent;
}

.task-context-menu::-webkit-scrollbar,
.task-context-menu-category-grid::-webkit-scrollbar {
  width: 8px;
}

.task-context-menu::-webkit-scrollbar-track,
.task-context-menu-category-grid::-webkit-scrollbar-track {
  background: transparent;
}

.task-context-menu::-webkit-scrollbar-thumb,
.task-context-menu-category-grid::-webkit-scrollbar-thumb {
  min-height: 28px;
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.48);
  background-clip: padding-box;
}

.task-context-menu-title {
  min-height: 34px;
  margin: 0 0 4px;
  padding: 5px 9px 7px;
  color: #111827;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 17px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-context-menu-section {
  padding: 7px 0;
  border-top: 1px solid rgba(15, 23, 42, 0.07);
}

.task-context-menu-section:last-child {
  padding-bottom: 0;
}

.task-context-menu-section-title {
  margin: 0 0 4px;
  padding: 0 8px;
  color: #7c8492;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 14px;
}

.task-context-menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 4px;
}

.task-context-menu-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.task-context-menu-category-grid {
  max-height: 104px;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.task-context-menu-choice {
  display: flex;
  min-width: 0;
  min-height: 32px;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #273142;
  cursor: default;
  font: inherit;
  font-size: 12.5px;
  font-weight: 560;
  justify-content: flex-start;
  padding: 0 8px;
  text-align: left;
  transition:
    background-color 90ms ease,
    color 90ms ease,
    box-shadow 90ms ease;
}

.task-context-menu-choice:not(:disabled):hover,
.task-context-menu-choice:not(:disabled):focus-visible {
  background: rgba(15, 23, 42, 0.055);
  outline: none;
}

.task-context-menu-choice:disabled {
  color: #aeb5c0;
}

.task-context-menu-choice.is-selected {
  background: #eef5ff;
  color: #145ea8;
  box-shadow:
    inset 0 0 0 1px rgba(37, 99, 235, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.task-context-menu-choice-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-context-menu-choice-mark {
  display: inline-flex;
  width: 13px;
  flex: 0 0 13px;
  justify-content: center;
  color: #1d6fd6;
  font-size: 12px;
  font-weight: 750;
  line-height: 1;
}

.task-context-menu-danger {
  width: 100%;
  min-height: 32px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #c21f17;
  cursor: default;
  font: inherit;
  font-size: 12.5px;
  font-weight: 620;
  padding: 0 9px;
  text-align: left;
  transition: background-color 90ms ease, color 90ms ease;
}

.task-context-menu-danger:hover,
.task-context-menu-danger:focus-visible {
  background: #fff1f1;
  color: #aa1b15;
  outline: none;
}
`;

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getRelativeDateInputValue = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toDateInputValue(date);
};

const TaskContextChoice = ({
  label,
  selected = false,
  disabled = false,
  onSelect,
}: TaskContextChoiceProps) => {
  return (
    <button
      type="button"
      className={`task-context-menu-choice${selected ? " is-selected" : ""}`}
      disabled={disabled}
      role="menuitemradio"
      aria-checked={selected}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (disabled) return;

        onSelect();
      }}
    >
      <span className="task-context-menu-choice-mark" aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
      <span className="task-context-menu-choice-label">{label}</span>
    </button>
  );
};

export const TaskContextMenu = ({
  x,
  y,
  task,
  categoryOptions,
  menuRef,
  noDragStyle,
  panelId = TASK_CONTEXT_PANEL_ID,
  onClose,
  onUpdateTask,
  onDeleteTask,
}: TaskContextMenuProps) => {
  const resolvedCategoryOptions = categoryOptions.length > 0 ? categoryOptions : TASK_CONTEXT_MENU_FALLBACK_CATEGORIES;
  const dueDateOptions = [
    { id: "today", label: "今日", value: getRelativeDateInputValue(0) },
    { id: "tomorrow", label: "明日", value: getRelativeDateInputValue(1) },
    { id: "none", label: "期限なし", value: null },
  ];
  const updateAndClose = (patch: TaskContextMenuUpdatePatch) => {
    onUpdateTask(task.id, patch);
    onClose();
  };

  return (
    <RightClickPanelSurface
      x={x}
      y={y}
      width={TASK_CONTEXT_MENU_WIDTH}
      panelRef={menuRef}
      noDragStyle={noDragStyle}
      className="task-context-menu"
      ariaLabel="task context menu"
      panelId={panelId}
    >
      <style>{TASK_CONTEXT_MENU_STYLE}</style>
      <div className="task-context-menu-title" title={task.title}>{task.title}</div>

      <section className="task-context-menu-section" aria-label="ステータス">
        <div className="task-context-menu-section-title">ステータス</div>
        <div className="task-context-menu-grid">
          {TASK_COLUMNS.map((status) => (
            <TaskContextChoice
              key={status.id}
              label={status.label}
              selected={task.status === status.id}
              onSelect={() => updateAndClose({ status: status.id })}
            />
          ))}
        </div>
      </section>

      <section className="task-context-menu-section" aria-label="優先度">
        <div className="task-context-menu-section-title">優先度</div>
        <div className="task-context-menu-grid task-context-menu-grid--three">
          {TASK_CONTEXT_MENU_PRIORITY_ORDER.map((priority) => (
            <TaskContextChoice
              key={priority}
              label={PRIORITY_CONFIG[priority].label}
              selected={task.priority === priority}
              onSelect={() => updateAndClose({ priority })}
            />
          ))}
        </div>
      </section>

      <section className="task-context-menu-section" aria-label="カテゴリ">
        <div className="task-context-menu-section-title">カテゴリ</div>
        <div className="task-context-menu-grid task-context-menu-category-grid">
          {resolvedCategoryOptions.map((category) => (
            <TaskContextChoice
              key={category.id}
              label={category.label}
              selected={task.category === category.id}
              onSelect={() => updateAndClose({ category: category.id })}
            />
          ))}
        </div>
      </section>

      <section className="task-context-menu-section" aria-label="期日">
        <div className="task-context-menu-section-title">期日</div>
        <div className="task-context-menu-grid task-context-menu-grid--three">
          {dueDateOptions.map((dueDate) => (
            <TaskContextChoice
              key={dueDate.id}
              label={dueDate.label}
              selected={task.dueDate === dueDate.value}
              onSelect={() => updateAndClose({ dueDate: dueDate.value })}
            />
          ))}
        </div>
      </section>

      <section className="task-context-menu-section" aria-label="操作">
        <button
          type="button"
          className="task-context-menu-danger"
          role="menuitem"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDeleteTask(task.id);
            onClose();
          }}
        >
          削除
        </button>
      </section>
    </RightClickPanelSurface>
  );
};
