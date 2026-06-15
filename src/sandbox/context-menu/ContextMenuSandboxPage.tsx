import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { ContextMenu, ContextMenuBuilder } from "@/../nouse/context-menu/ContextMenu";

type MenuPosition = {
  x: number;
  y: number;
};
type DemoLog = {
  id: string;
  label: string;
};

const MENU_WIDTH = 260;
const MENU_OFFSET = 8;
const createDemoLogId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clampMenuPosition = (event: MouseEvent<HTMLElement>): MenuPosition => ({
  x: Math.min(Math.max(event.clientX, MENU_OFFSET), Math.max(MENU_OFFSET, window.innerWidth - MENU_WIDTH - MENU_OFFSET)),
  y: Math.min(Math.max(event.clientY, MENU_OFFSET), Math.max(MENU_OFFSET, window.innerHeight - MENU_OFFSET)),
});
const ContextMenuSandboxPage = () => {
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [checked, setChecked] = useState(false);
  const [logs, setLogs] = useState<DemoLog[]>([]);
  const pushLog = useCallback((label: string) => {
    setLogs((currentLogs) => [{ id: createDemoLogId(), label }, ...currentLogs.slice(0, 5)]);
  }, []);
  const closeMenu = useCallback(() => setMenuPosition(null), []);
  const openMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMenuPosition(clampMenuPosition(event));
  }, []);
  const items = useMemo(
    () =>
      ContextMenuBuilder.build((menu) =>
        menu
          .header("Context menu demo")
          .entry("Open", { id: "open", shortcut: "Enter", run: () => pushLog("Open") })
          .entry("Rename", { id: "rename", shortcut: "F2", run: () => pushLog("Rename") })
          .actionCheckedWithDisabled(
            "Checked option",
            {
              id: "checked-option",
              shortcut: "⌘K",
              run: () => {
                setChecked((currentValue) => !currentValue);
                pushLog("Toggle checked option");
              },
            },
            checked,
            false,
          )
          .separator()
          .submenu("Create", () =>
            ContextMenuBuilder.build((submenu) =>
              submenu
                .entry("Document", { id: "document", run: () => pushLog("Create document") })
                .entry("Card set", { id: "card-set", run: () => pushLog("Create card set") })
                .actionDisabledWhen(true, "Locked item", { id: "locked", run: () => pushLog("Locked item") }),
            ),
          )
          .customEntry(
            () => <span className="font-medium">Custom row</span>,
            () => pushLog("Custom row"),
          ),
      ),
    [checked, pushLog],
  );
  const menuStyle: CSSProperties | undefined = menuPosition
    ? { left: menuPosition.x, position: "fixed", top: menuPosition.y, zIndex: 1000 }
    : undefined;
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">nouse/context-menu</p>
          <h1 className="mt-2 text-2xl font-semibold">ContextMenu trial</h1>
          <p className="mt-2 text-sm text-slate-600">下の白い領域を右クリックすると menu が出ます。</p>
        </div>
        <div className="min-h-72 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onContextMenu={openMenu}>
          <div className="text-sm font-semibold">Right click target</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">hover submenu、上下キー、Enter、Escape、左右キーを試せます。</p>
        </div>
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
      {menuPosition && <ContextMenu items={items} fixedWidth={MENU_WIDTH} onDismiss={closeMenu} style={menuStyle} />}
    </main>
  );
};

export { ContextMenuSandboxPage };
