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

export const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = 196;
export const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = 128;
export const WORKSPACE_TAB_CONTEXT_MENU_MARGIN = 8;

const WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY =
  "var(--explorer-chrome-font-family, \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, \"Yu Gothic UI\", \"Hiragino Sans\", sans-serif)";

const WORKSPACE_TAB_CONTEXT_MENU_STYLE = `
.workspace-tab-context-menu {
  min-width: 136px;
  width: max-content;
  max-width: 196px;
  padding: 3px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14), 0 1px 6px rgba(0, 0, 0, 0.08);
  font-family: ${WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY};
  font-variant-east-asian: proportional-width;
  font-feature-settings: "palt" 1;
}

.workspace-tab-context-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #4a4a4a;
  font-family: ${WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY};
  font-size: 13px;
  font-weight: 400;
  line-height: 16px;
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
