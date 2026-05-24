import { MantineProvider, Menu } from "@mantine/core";
import type { CSSProperties, RefObject } from "react";

import "@mantine/core/styles.css";
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

export const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = 180;
export const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = 184;
export const WORKSPACE_TAB_CONTEXT_MENU_MARGIN = 8;

const WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY = "var(--app-font-family-ui)";

const WORKSPACE_TAB_CONTEXT_MENU_DROPDOWN_STYLE: CSSProperties = {
  minWidth: 148,
  width: "max-content",
  maxWidth: 220,
  padding: 4,
  fontFamily: WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY,
};

const WORKSPACE_TAB_CONTEXT_MENU_TEXT_STYLE: CSSProperties = {
  fontFamily: WORKSPACE_TAB_CONTEXT_MENU_FONT_FAMILY,
  fontSize: 13,
  fontWeight: 400,
  lineHeight: "18px",
  letterSpacing: 0,
  color: "#3f3f3f",
  WebkitFontSmoothing: "antialiased",
};

const WORKSPACE_TAB_CONTEXT_MENU_ITEM_STYLE: CSSProperties = {
  ...WORKSPACE_TAB_CONTEXT_MENU_TEXT_STYLE,
  minHeight: 44,
  paddingBlock: 0,
  paddingInline: 18,
  whiteSpace: "nowrap",
};

export const WorkspaceTabContextMenu = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
}: TabContextMenuProps) => {
  return (
    <MantineProvider defaultColorScheme="light">
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
          styles={{
            dropdown: WORKSPACE_TAB_CONTEXT_MENU_DROPDOWN_STYLE,
            item: WORKSPACE_TAB_CONTEXT_MENU_ITEM_STYLE,
            itemLabel: WORKSPACE_TAB_CONTEXT_MENU_TEXT_STYLE,
          }}
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
                style={WORKSPACE_TAB_CONTEXT_MENU_ITEM_STYLE}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  action.onSelect();
                }}
              >
                <span style={WORKSPACE_TAB_CONTEXT_MENU_TEXT_STYLE}>
                  {action.label}
                </span>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </div>
    </MantineProvider>
  );
};
