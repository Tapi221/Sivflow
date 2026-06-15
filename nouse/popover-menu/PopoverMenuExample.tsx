import React, { useMemo } from "react";
import { PopoverMenu, usePopoverMenuHandle } from "./PopoverMenu";
import "./PopoverMenu.css";

/**
 * This example intentionally uses a plain menu body so PopoverMenu can be tested
 * without depending on ContextMenu.tsx. In your app, replace the <div role="menu">
 * content with <ContextMenu items={...} onDismiss={handle.hide} />.
 */
export function PopoverMenuExample() {
  const handle = usePopoverMenuHandle();

  const menu = useMemo(
    () => () => (
      <div
        role="menu"
        style={{
          minWidth: 200,
          padding: 4,
          border: "1px solid #363636",
          borderRadius: 8,
          background: "#202020",
          color: "#dedede",
          boxShadow: "0 12px 32px rgb(0 0 0 / 35%), 0 2px 8px rgb(0 0 0 / 25%)",
        }}
      >
        <button type="button" role="menuitem" onClick={() => console.log("New File")}>
          New File
        </button>
        <button type="button" role="menuitem" onClick={() => console.log("Open File")}>
          Open File
        </button>
        <hr />
        <button type="button" role="menuitem" onClick={() => console.log("New Terminal")}>
          New Terminal
        </button>
      </div>
    ),
    [],
  );

  return (
    <div style={{ padding: 48 }}>
      <PopoverMenu
        id="pane-tab-bar-popover-menu"
        handle={handle}
        anchor="top-right"
        menu={menu}
        onOpen={() => console.log("opened")}
      >
        {({ open, triggerProps }) => (
          <button
            type="button"
            aria-pressed={open}
            title={open ? undefined : "New."}
            {...triggerProps}
          >
            +
          </button>
        )}
      </PopoverMenu>

      <button type="button" onClick={() => handle.toggle()} style={{ marginLeft: 12 }}>
        Toggle from handle
      </button>
    </div>
  );
}
