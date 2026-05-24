import { Menu } from "@mantine/core";
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

export const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = 220;
export const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = 152;
export const WORKSPACE_TAB_CONTEXT_MENU_MARGIN = 8;

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
      style={noDragStyle}
      className="bn-container bn-mantine fixed left-0 top-0 z-[1000]"
    >
      <Menu
        opened
        withinPortal={false}
        position="bottom-start"
        offset={0}
        shadow="md"
      >
        <Menu.Target>
          <button
            type="button"
            aria-label="tab menu anchor"
            tabIndex={-1}
            style={{
              ...noDragStyle,
              position: "fixed",
              left: x,
              top: y,
              width: 0,
              height: 0,
              margin: 0,
              padding: 0,
              border: 0,
              background: "transparent",
              pointerEvents: "none",
            }}
          />
        </Menu.Target>

        <Menu.Dropdown style={noDragStyle}>
          {actions.map((action) => (
            <Menu.Item
              key={action.id}
              disabled={action.disabled}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                action.onSelect();
              }}
            >
              {action.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </div>
  );
};
