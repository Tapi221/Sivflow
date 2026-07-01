import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { PopoverMenu, usePopoverMenuHandle } from "@/nouse/popover-menu/PopoverMenu";

type DemoLog = {
  id: string;
  label: string;
};
type DemoMenuContentProps = {
  title: string;
  dense: boolean;
  onAction: (label: string) => void;
  onToggleDense: () => void;
  footer?: ReactNode;
};
type MenuItemProps = {
  label: string;
  shortcut?: string;
  onClick: () => void;
};

const MENU_PANEL_CLASS_NAME = "pm-zed-menu";
const MENU_HEADER_CLASS_NAME = "pm-zed-menu-header";
const MENU_ITEM_CLASS_NAME = "pm-zed-menu-item";
const MENU_ITEM_LABEL_CLASS_NAME = "pm-zed-menu-item-label";
const MENU_SHORTCUT_CLASS_NAME = "pm-zed-menu-item-shortcut";
const MENU_SEPARATOR_CLASS_NAME = "pm-zed-menu-separator";
const MENU_MUTED_ITEM_CLASS_NAME = "pm-zed-menu-note";
const TRIGGER_CLASS_NAME = "pm-zed-trigger";
const FULL_WIDTH_TRIGGER_CLASS_NAME = "pm-zed-trigger pm-zed-trigger-full-width";
const createDemoLogId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const MenuItem = ({ label, shortcut, onClick }: MenuItemProps) => {
  return (
    <button className={MENU_ITEM_CLASS_NAME} type="button" role="menuitem" onClick={onClick}>
      <span className={MENU_ITEM_LABEL_CLASS_NAME}>{label}</span>
      {shortcut ? <span className={MENU_SHORTCUT_CLASS_NAME}>{shortcut}</span> : null}
    </button>
  );
};
const DemoMenuContent = ({ title, dense, onAction, onToggleDense, footer }: DemoMenuContentProps) => {
  return (
    <div className={MENU_PANEL_CLASS_NAME} role="menu">
      <div className={MENU_HEADER_CLASS_NAME}>{title}</div>
      <MenuItem label="Open" shortcut="Enter" onClick={() => onAction("Open")} />
      <MenuItem label="Rename" shortcut="F2" onClick={() => onAction("Rename")} />
      <MenuItem label="Dense rows" shortcut={dense ? "On" : "Off"} onClick={onToggleDense} />
      <div className={MENU_SEPARATOR_CLASS_NAME} />
      <MenuItem label="Move to Today" shortcut="M" onClick={() => onAction("Move to Today")} />
      <MenuItem label="Archive" shortcut="A" onClick={() => onAction("Archive")} />
      <div className={MENU_MUTED_ITEM_CLASS_NAME}>outside click / Escape で閉じます。</div>
      {footer}
    </div>
  );
};
const PopoverMenuSandboxPage = () => {
  const primaryHandle = usePopoverMenuHandle();
  const [dense, setDense] = useState(false);
  const [logs, setLogs] = useState<DemoLog[]>([]);
  const pushLog = useCallback((label: string) => {
    setLogs((currentLogs) => [{ id: createDemoLogId(), label }, ...currentLogs.slice(0, 7)]);
  }, []);
  const toggleDense = useCallback(() => {
    setDense((currentValue) => !currentValue);
    pushLog("Toggle dense rows");
  }, [pushLog]);
  const renderMenu = useCallback(
    (title: string) => (
      <DemoMenuContent
        title={title}
        dense={dense}
        onAction={pushLog}
        onToggleDense={toggleDense}
        footer={dense ? <div className={MENU_MUTED_ITEM_CLASS_NAME}>dense state is shared across popovers</div> : null}
      />
    ),
    [dense, pushLog, toggleDense],
  );
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">nouse/popover-menu</p>
          <h1 className="mt-2 text-2xl font-semibold">PopoverMenu trial</h1>
          <p className="mt-2 text-sm text-slate-600">button trigger、anchor / attach、fullWidth、handle.show / hide を試せます。</p>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <PopoverMenu id="popover-primary" anchor="bottom-left" attach="top-left" handle={primaryHandle} menu={() => renderMenu("Primary popover")} onOpen={() => pushLog("Primary open")} onDismiss={(reason) => pushLog(`Primary dismiss: ${reason}`)}>
              {({ open, triggerProps }) => (
                <button className={TRIGGER_CLASS_NAME} type="button" {...triggerProps}>
                  {open ? "Close primary" : "Open primary"}
                </button>
              )}
            </PopoverMenu>
            <button className={TRIGGER_CLASS_NAME} type="button" onClick={() => primaryHandle.show()}>
              handle.show()
            </button>
            <button className={TRIGGER_CLASS_NAME} type="button" onClick={() => primaryHandle.hide()}>
              handle.hide()
            </button>
            <PopoverMenu id="popover-right" anchor="bottom-right" attach="top-right" menu={() => renderMenu("Right aligned")}>
              {({ open, triggerProps }) => (
                <button className={TRIGGER_CLASS_NAME} type="button" {...triggerProps}>
                  {open ? "Close right" : "Right aligned"}
                </button>
              )}
            </PopoverMenu>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PopoverMenu id="popover-full-width" anchor="bottom-left" attach="top-left" fullWidth menu={() => renderMenu("Full width trigger")}>
            {({ open, triggerProps }) => (
              <button className={FULL_WIDTH_TRIGGER_CLASS_NAME} type="button" {...triggerProps}>
                <span>Full width popover trigger</span>
                <span className={MENU_SHORTCUT_CLASS_NAME}>{open ? "open" : "closed"}</span>
              </button>
            )}
          </PopoverMenu>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Action log</h2>
          {logs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">まだ action は実行されていません。</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {logs.map((log) => (
                <li key={log.id} className="rounded-lg bg-slate-50 px-3 py-2">{log.label}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export { PopoverMenuSandboxPage };
