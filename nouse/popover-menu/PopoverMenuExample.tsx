import { useMemo } from "react";
import { PopoverMenu, usePopoverMenuHandle } from "@/nouse/popover-menu/PopoverMenu";

const PopoverMenuExample = () => {
  const handle = usePopoverMenuHandle();
  const menu = useMemo(
    () => () => (
      <div className="pm-zed-menu" role="menu">
        <button className="pm-zed-menu-item" type="button" role="menuitem" onClick={() => console.log("新規ファイル")}>
          <span className="pm-zed-menu-item-label">New File</span>
        </button>
        <button className="pm-zed-menu-item" type="button" role="menuitem" onClick={() => console.log("ファイルを開く")}>
          <span className="pm-zed-menu-item-label">Open File</span>
        </button>
        <div className="pm-zed-menu-separator" />
        <button className="pm-zed-menu-item" type="button" role="menuitem" onClick={() => console.log("新規ターミナル")}>
          <span className="pm-zed-menu-item-label">New Terminal</span>
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
        onOpen={() => console.log("開きました")}
      >
        {({ open, triggerProps }) => (
          <button
            className="pm-zed-trigger"
            type="button"
            aria-pressed={open}
            title={open ? undefined : "New."}
            {...triggerProps}
          >
            +
          </button>
        )}
      </PopoverMenu>
      <button className="pm-zed-trigger" type="button" onClick={() => handle.toggle()} style={{ marginLeft: 12 }}>
        Toggle from handle
      </button>
    </div>
  );
};

export { PopoverMenuExample };