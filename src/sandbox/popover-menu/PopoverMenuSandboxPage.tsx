import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { PopoverMenu, usePopoverMenuHandle } from "@/../nouse/popover-menu/PopoverMenu";

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

const MENU_PANEL_CLASS_NAME = "min-w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-sm text-slate-900 shadow-xl";
const MENU_ITEM_CLASS_NAME = "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100";
const MENU_MUTED_ITEM_CLASS_NAME = "px-3 py-2 text-xs text-slate-500";
const createDemoLogId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const DemoMenuContent = ({ title, dense, onAction, onToggleDense, footer }: DemoMenuContentProps) => {
  return (
    <div className={MENU_PANEL_CLASS_NAME}>
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <button className={MENU_ITEM_CLASS_NAME} type="button" onClick={() => onAction("Open")}>Open<span className="text-xs text-slate-400">Enter</span></button>
      <button className={MENU_ITEM_CLASS_NAME} type="button" onClick={() => onAction("Rename")}>Rename<span className="text-xs text-slate-400">F2</span></button>
      <button className={MENU_ITEM_CLASS_NAME} type="button" onClick={onToggleDense}>Dense rows<span className="text-xs text-slate-400">{dense ? "On" : "Off"}</span></button>
      <div className="my-1 h-px bg-slate-100" />
      <button className={MENU_ITEM_CLASS_NAME} type="button" onClick={() => onAction("Move to Today")}>Move to Today<span className="text-xs text-slate-400">M</span></button>
      <button className={MENU_ITEM_CLASS_NAME} type="button" onClick={() => onAction("Archive")}>Archive<span className="text-xs text-slate-400">A</span></button>
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
        footer={dense ? <div className="px-3 pb-2 text-xs text-blue-600">dense state is shared across popovers</div> : null}
      />
    ),
    [dense, pushLog, toggleDense],
  );
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">nouse/popover-menu</p>
          <h1 className="mt-2 text-2xl font-semibold">PopoverMenu trial</h1>
          <p className="mt-2 text-sm text-slate-600">button trigger、anchor / attach、fullWidth、handle.show / hide を試せます。</p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <PopoverMenu id="popover-primary" anchor="bottom-left" attach="top-left" handle={primaryHandle} menu={() => renderMenu("Primary popover") } onOpen={() => pushLog("Primary open")} onDismiss={() => pushLog("Primary dismiss")}>
              {({ open, triggerProps }) => (
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="button" {...triggerProps}>
                  {open ? "Close primary" : "Open primary"}
                </button>
              )}
            </PopoverMenu>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm" type="button" onClick={() => primaryHandle.show()}>
              handle.show()
            </button>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm" type="button" onClick={() => primaryHandle.hide()}>
              handle.hide()
            </button>
            <PopoverMenu id="popover-right" anchor="bottom-right" attach="top-right" menu={() => renderMenu("Right aligned") }>
              {({ open, triggerProps }) => (
                <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm" type="button" {...triggerProps}>
                  {open ? "Close right" : "Right aligned"}
                </button>
              )}
            </PopoverMenu>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PopoverMenu id="popover-full-width" anchor="bottom-left" attach="top-left" fullWidth menu={() => renderMenu("Full width trigger") }>
            {({ open, triggerProps }) => (
              <button className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900" type="button" {...triggerProps}>
                <span>Full width popover trigger</span>
                <span className="text-xs text-slate-500">{open ? "open" : "closed"}</span>
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
