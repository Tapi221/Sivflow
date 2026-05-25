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
export const TASK_CONTEXT_MENU_WIDTH = 268;
export const TASK_CONTEXT_MENU_HEIGHT = 440;
export const TASK_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const TASK_CONTEXT_MENU_STYLE = `
.task-context-menu {
  max-height: min(${TASK_CONTEXT_MENU_HEIGHT}px, calc(100vh - ${TASK_CONTEXT_MENU_MARGIN * 2}px));
  overflow-y: auto;
}

.task-context-menu-title {
  min-height: 31px;
  padding: 6px 9px 7px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  color: #111827;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-context-menu-section {
  padding: 7px 6px 6px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.07);
}

.task-context-menu-section:last-child {
  border-bottom: 0;
}

.task-context-menu-section-title {
  margin: 0 0 5px;
  padding: 0 3px;
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  line-height: 14px;
}

.task-context-menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.task-context-menu-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.task-context-menu-category-grid {
  max-height: 116px;
  overflow-y: auto;
  padding-right: 1px;
}

.task-context-menu-choice {
  display: flex;
  min-width: 0;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #374151;
  cursor: default;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  justify-content: flex-start;
  padding: 0 7px;
  text-align: left;
  transition: background-color 80ms linear, color 80ms linear;
}

.task-context-menu-choice:not(:disabled):hover,
.task-context-menu-choice:not(:disabled):focus-visible {
  background: #eeeeee;
  outline: none;
}

.task-context-menu-choice:disabled {
  color: #b8b8b8;
}

.task-context-menu-choice.is-selected {
  background: #e8f2ff;
  color: #155ea8;
}

.task-context-menu-choice-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-context-menu-choice-mark {
  display: inline-flex;
  width: 12px;
  flex: 0 0 12px;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.task-context-menu-danger {
  width: 100%;
  min-height: 28px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #b42318;
  cursor: default;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 0 8px;
  text-align: left;
  transition: background-color 80ms linear;
}

.task-context-menu-danger:hover,
.task-context-menu-danger:focus-visible {
  background: #fee2e2;
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
