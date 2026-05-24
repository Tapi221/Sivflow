import type { CSSProperties, RefObject } from "react";

import "@blocknote/react/style.css";
import "@blocknote/mantine/style.css";

type TabContextMenuAction = {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
};

type TabContextMenuProps = {
  x: number;
  y: number;
  actions: TabContextMenuAction[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
};

export const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = 240;
export const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = 184;
export const WORKSPACE_TAB_CONTEXT_MENU_MARGIN = 8;

const WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY = "var(--app-font-family-ui)";

const WORKSPACE_TAB_CONTEXT_MENU_STYLE = `
.workspace-tab-context-menu {
  min-width: 148px;
  width: max-content;
  max-width: 240px;
  padding: 4px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: ${WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY};
}

.workspace-tab-context-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #4a4a4a;
  font-family: ${WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY};
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0;
  text-align: left;
  white-space: nowrap;
  -webkit-font-smoothing: antialiased;
}

.workspace-tab-context-menu-item:not(:disabled) {
  cursor: default;
}

.workspace-tab-context-menu-item:not(:disabled):hover,
.workspace-tab-context-menu-item:not(:disabled):focus-visible {
  background: #eeeeee;
  outline: none;
}

.workspace-tab-context-menu-item:disabled {
  color: #b8b8b8;
  cursor: default;
}
`;

export const WorkspaceTabContextMenu = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
}: TabContextMenuProps) => {
  return (
    <div
      ref={menuRef}
      style={{
        ...noDragStyle,
        position: "fixed",
        left: x,
        top: y,
        zIndex: 1000,
      }}
      className="bn-container bn-mantine workspace-tab-context-menu"
      role="menu"
      aria-label="tab context menu"
    >
      <style>{WORKSPACE_TAB_CONTEXT_MENU_STYLE}</style>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={action.disabled}
          className="workspace-tab-context-menu-item"
          role="menuitem"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (action.disabled) return;

            action.onSelect();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};
