import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, MouseEvent } from "react";
import { ContextMenu, ContextMenuBuilder } from "@/nouse/context-menu/ContextMenu";

type MenuPosition = {
  x: number;
  y: number;
};
type DemoLog = {
  id: string;
  label: string;
};
type MenuTheme = "dark" | "light";
type MenuCssProperties = CSSProperties & {
  "--menu-bg": string;
  "--menu-fg": string;
  "--menu-muted": string;
  "--menu-border": string;
  "--menu-selected-bg": string;
  "--menu-selected-fg": string;
  "--menu-separator": string;
  "--menu-accent": string;
};

const MENU_WIDTH = 260;
const MENU_OFFSET = 8;
const MENU_THEME_STYLES: Record<MenuTheme, MenuCssProperties> = {
  dark: {
    "--menu-bg": "#202020",
    "--menu-fg": "#dedede",
    "--menu-muted": "#9a9a9a",
    "--menu-border": "#363636",
    "--menu-selected-bg": "#2f5fdd",
    "--menu-selected-fg": "#fff",
    "--menu-separator": "#383838",
    "--menu-accent": "#74a3ff",
  },
  light: {
    "--menu-bg": "#fff",
    "--menu-fg": "#202124",
    "--menu-muted": "#6b7280",
    "--menu-border": "#e5e7eb",
    "--menu-selected-bg": "#e8f0fe",
    "--menu-selected-fg": "#174ea6",
    "--menu-separator": "#edf0f3",
    "--menu-accent": "#2563eb",
  },
};
const MENU_THEME_LABEL: Record<MenuTheme, string> = {
  dark: "Dark",
  light: "Light",
};
const createDemoLogId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clampMenuPosition = (x: number, y: number): MenuPosition => ({
  x: Math.min(Math.max(x, MENU_OFFSET), Math.max(MENU_OFFSET, window.innerWidth - MENU_WIDTH - MENU_OFFSET)),
  y: Math.min(Math.max(y, MENU_OFFSET), Math.max(MENU_OFFSET, window.innerHeight - MENU_OFFSET)),
});
const ContextMenuSandboxPage = () => {
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [menuTheme, setMenuTheme] = useState<MenuTheme>("dark");
  const [checked, setChecked] = useState(false);
  const [logs, setLogs] = useState<DemoLog[]>([]);
  const pushLog = useCallback((label: string) => {
    setLogs((currentLogs) => [{ id: createDemoLogId(), label }, ...currentLogs.slice(0, 5)]);
  }, []);
  const closeMenu = useCallback(() => setMenuPosition(null), []);
  const openMenuAt = useCallback((x: number, y: number, label: string, theme: MenuTheme = menuTheme) => {
    setMenuTheme(theme);
    setMenuPosition(clampMenuPosition(x, y));
    pushLog(label);
  }, [menuTheme, pushLog]);
  const openMenuFromContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openMenuAt(event.clientX, event.clientY, `${menuTheme} right click captured`, menuTheme);
  }, [menuTheme, openMenuAt]);
  const openMenuFromButton = useCallback((event: MouseEvent<HTMLButtonElement>, theme: MenuTheme) => {
    const rect = event.currentTarget.getBoundingClientRect();
    openMenuAt(rect.left, rect.bottom + 8, `${theme} button open captured`, theme);
  }, [openMenuAt]);
  const items = useMemo(
    () =>
      ContextMenuBuilder.build((menu) =>
        menu
          .header(`${MENU_THEME_LABEL[menuTheme]} context menu demo`)
          .entry("Open", { id: "open", shortcut: "Enter", run: () => pushLog("Open") })
          .entry("Rename", { id: "rename", shortcut: "F2", run: () => pushLog("Rename") })
          .actionCheckedWithDisabled(
            "Checked option",
            {
              id: "checked-option",
              shortcut: "Cmd K",
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
    [checked, menuTheme, pushLog],
  );
  const menuStyle: CSSProperties | undefined = menuPosition
    ? {
      ...MENU_THEME_STYLES[menuTheme],
      left: menuPosition.x,
      position: "fixed",
      top: menuPosition.y,
      zIndex: 2147483647,
    }
    : undefined;
  const menuElement = menuPosition && menuStyle
    ? createPortal(<ContextMenu items={items} fixedWidth={MENU_WIDTH} onDismiss={closeMenu} style={menuStyle} />, document.body)
    : null;
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">nouse/context-menu</p>
          <h1 className="mt-2 text-2xl font-semibold">ContextMenu trial</h1>
          <p className="mt-2 text-sm text-slate-600">白い領域を右クリック。Dark / Light のボタンで両方の menu を比較できます。</p>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={(event) => openMenuFromButton(event, "dark")}>
            Open dark menu
          </button>
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm" type="button" onClick={(event) => openMenuFromButton(event, "light")}>
            Open light menu
          </button>
          <span className="text-sm text-slate-600">theme: {menuTheme}</span>
          <span className="text-sm text-slate-600">menu: {menuPosition ? `open (${Math.round(menuPosition.x)}, ${Math.round(menuPosition.y)})` : "closed"}</span>
        </div>
        <div className="min-h-72 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onContextMenu={openMenuFromContextMenu}>
          <div className="text-sm font-semibold">Right click target</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">右クリックでは現在の theme で menu を開きます。hover submenu、上下キー、Enter、Escape、左右キーを試せます。</p>
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
      {menuElement}
    </main>
  );
};

export { ContextMenuSandboxPage };
