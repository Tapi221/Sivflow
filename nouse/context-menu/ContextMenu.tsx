import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "@/nouse/context-menu/ContextMenu.css";

type IconPosition = "start" | "end";
type DocumentationSide = "left" | "right";
type SubmenuOpenTrigger = "pointer" | "keyboard";
type HoverTarget = "none" | "mainMenu" | "submenu";
type MenuAction = { id: string; shortcut?: string; run: () => void };
type DocumentationAside = { side: DocumentationSide; render: () => ReactNode };
type ContextMenuEntry = {
  label: string;
  toggle?: { position: IconPosition; checked: boolean };
  icon?: ReactNode;
  iconPosition?: IconPosition;
  disabled?: boolean;
  action?: MenuAction;
  shortcut?: string;
  documentationAside?: DocumentationAside;
  endSlot?: ReactNode;
  endSlotTitle?: string;
  showEndSlotOnHover?: boolean;
  onSelect?: () => void;
  onSecondarySelect?: () => void;
};
type ContextMenuItem =
  | { type: "separator" }
  | { type: "header"; label: string }
  | { type: "headerWithLink"; label: string; linkLabel: string; linkUrl: string }
  | { type: "label"; label: string }
  | { type: "entry"; entry: ContextMenuEntry }
  | { type: "custom"; render: () => ReactNode; selectable?: boolean; documentationAside?: DocumentationAside; onSelect?: () => void }
  | { type: "submenu"; label: string; icon?: ReactNode; iconColor?: string; builder: () => ContextMenuItem[] };
type ContextMenuProps = {
  items: ContextMenuItem[];
  fixedWidth?: number | string;
  keepOpenOnConfirm?: boolean;
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
  autoFocus?: boolean;
  estimatedSubmenuWidth?: number;
  __submenuDepth?: number;
  __onCancelSubmenu?: () => void;
  __onRequestParentFocus?: () => void;
};
type OpenSubmenu = { itemIndex: number; items: ContextMenuItem[]; offsetTop: number; flipLeft: boolean; trigger: SubmenuOpenTrigger };

class ContextMenuBuilder {
  readonly items: ContextMenuItem[] = [];
  static build(fn: (menu: ContextMenuBuilder) => ContextMenuBuilder): ContextMenuItem[] {
    return fn(new ContextMenuBuilder()).items;
  }
  header(label: string): this {
    this.items.push({ type: "header", label });
    return this;
  }
  headerWithLink(label: string, linkLabel: string, linkUrl: string): this {
    this.items.push({ type: "headerWithLink", label, linkLabel, linkUrl });
    return this;
  }
  separator(): this {
    this.items.push({ type: "separator" });
    return this;
  }
  label(label: string): this {
    this.items.push({ type: "label", label });
    return this;
  }
  item(item: ContextMenuItem): this {
    this.items.push(item);
    return this;
  }
  extend(items: ContextMenuItem[]): this {
    this.items.push(...items);
    return this;
  }
  entry(label: string, action?: MenuAction | null, onSelect?: () => void): this {
    this.items.push({ type: "entry", entry: { label, action: action ?? undefined, shortcut: action?.shortcut, iconPosition: "end", onSelect } });
    return this;
  }
  entryObject(entry: ContextMenuEntry): this {
    this.items.push({ type: "entry", entry });
    return this;
  }
  action(label: string, action: MenuAction): this {
    return this.actionCheckedWithDisabled(label, action, false, false);
  }
  actionChecked(label: string, action: MenuAction, checked: boolean): this {
    return this.actionCheckedWithDisabled(label, action, checked, false);
  }
  actionCheckedWithDisabled(label: string, action: MenuAction, checked: boolean, disabled: boolean): this {
    this.items.push({ type: "entry", entry: { label, action, shortcut: action.shortcut, disabled, iconPosition: "end", toggle: checked ? { position: "start", checked: true } : undefined, onSelect: action.run } });
    return this;
  }
  actionDisabledWhen(disabled: boolean, label: string, action: MenuAction): this {
    this.items.push({ type: "entry", entry: { label, action, shortcut: action.shortcut, disabled, iconPosition: "end", onSelect: action.run } });
    return this;
  }
  link(label: string, action: MenuAction): this {
    return this.linkWithHandler(label, action, () => undefined);
  }
  linkWithHandler(label: string, action: MenuAction, handler: () => void): this {
    this.items.push({ type: "entry", entry: { label, action, shortcut: action.shortcut, icon: "↗", iconPosition: "end", onSelect: () => { handler(); action.run(); } } });
    return this;
  }
  toggleableEntry(label: string, toggled: boolean, position: IconPosition, action: MenuAction | null, onSelect: () => void): this {
    this.items.push({ type: "entry", entry: { label, action: action ?? undefined, shortcut: action?.shortcut, iconPosition: position, toggle: { position, checked: toggled }, onSelect } });
    return this;
  }
  customRow(render: () => ReactNode): this {
    this.items.push({ type: "custom", render, selectable: false });
    return this;
  }
  customEntry(render: () => ReactNode, onSelect: () => void): this {
    this.items.push({ type: "custom", render, selectable: true, onSelect });
    return this;
  }
  customEntryWithDocs(render: () => ReactNode, onSelect: () => void, documentationAside?: DocumentationAside): this {
    this.items.push({ type: "custom", render, selectable: true, onSelect, documentationAside });
    return this;
  }
  submenu(label: string, builder: () => ContextMenuItem[]): this {
    this.items.push({ type: "submenu", label, builder });
    return this;
  }
  submenuWithIcon(label: string, icon: ReactNode, builder: () => ContextMenuItem[]): this {
    this.items.push({ type: "submenu", label, icon, builder });
    return this;
  }
  submenuWithColoredIcon(label: string, icon: ReactNode, iconColor: string, builder: () => ContextMenuItem[]): this {
    this.items.push({ type: "submenu", label, icon, iconColor, builder });
    return this;
  }
}

const DEFAULT_MENU_MIN_WIDTH = 200;
const SNAP_TO_WINDOW_MARGIN = 8;
const SUBMENU_PADDING = 50;
const BLUR_IGNORE_MS = 150;
const WIDE_WINDOW_MIN_WIDTH = 800;
const joinClassNames = (values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");
const isSelectable = (item: ContextMenuItem) => item.type === "entry" ? !item.entry.disabled : item.type === "custom" ? item.selectable ?? true : item.type === "submenu";
const getAside = (item: ContextMenuItem | undefined) => item?.type === "entry" ? item.entry.documentationAside ?? null : item?.type === "custom" ? item.documentationAside ?? null : null;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
const inflateRect = (rect: DOMRect, amount: number) => new DOMRect(rect.x - amount, rect.y - amount, rect.width + amount * 2, rect.height + amount * 2);
const rectContainsPoint = (rect: DOMRect, x: number, y: number) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
const rowClassName = (base: "cm-child" | "cm-submenu-trigger", selected: boolean, disabled = false, hasEndSlot = false) => joinClassNames([base, !disabled ? "cm-child-selectable" : false, selected ? "cm-selected" : false, disabled ? "cm-child-disabled" : false, hasEndSlot ? "cm-item-has-end-slot" : false]);

const ContextMenu = ({ items, fixedWidth, keepOpenOnConfirm = false, onDismiss, className, style, autoFocus = true, estimatedSubmenuWidth = 220, __submenuDepth = 0, __onCancelSubmenu, __onRequestParentFocus }: ContextMenuProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const submenuContainerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<OpenSubmenu | null>(null);
  const [documentationAside, setDocumentationAside] = useState<{ index: number; aside: DocumentationAside; top: number; height: number } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>("mainMenu");
  const [submenuSafetyThresholdX, setSubmenuSafetyThresholdX] = useState<number | null>(null);
  const [submenuTriggerMouseDown, setSubmenuTriggerMouseDown] = useState(false);
  const ignoreBlurUntilRef = useRef(0);
  const selectableIndexes = useMemo(() => items.map((item, index) => isSelectable(item) ? index : -1).filter((index) => index >= 0), [items]);
  useEffect(() => {
    if (autoFocus) queueMicrotask(() => menuRef.current?.focus());
  }, [autoFocus]);
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target !== null && wrapperRef.current?.contains(target)) return;
      const submenuRect = submenuContainerRef.current?.getBoundingClientRect();
      if (openSubmenu !== null && submenuRect !== undefined && rectContainsPoint(inflateRect(submenuRect, SUBMENU_PADDING), event.clientX, event.clientY)) return;
      onDismiss?.();
    };
    document.addEventListener("mousedown", onPointerDown, true);
    return () => document.removeEventListener("mousedown", onPointerDown, true);
  }, [onDismiss, openSubmenu]);
  useEffect(() => {
    const item = selectedIndex === null ? undefined : items[selectedIndex];
    const aside = getAside(item);
    const row = selectedIndex === null ? null : rowRefs.current.get(selectedIndex) ?? null;
    const menu = menuRef.current;
    if (aside === null || row === null || menu === null) {
      setDocumentationAside(null);
      return;
    }
    const rowRect = row.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    setDocumentationAside({ index: selectedIndex, aside, top: rowRect.top - menuRect.top, height: rowRect.height });
  }, [selectedIndex, items]);
  useLayoutEffect(() => {
    if (openSubmenu === null) return;
    const menu = menuRef.current;
    const submenu = submenuContainerRef.current;
    if (menu === null || submenu === null) return;
    const menuRect = menu.getBoundingClientRect();
    const submenuRect = submenu.getBoundingClientRect();
    const minTop = SNAP_TO_WINDOW_MARGIN - menuRect.top;
    const maxTop = window.innerHeight - SNAP_TO_WINDOW_MARGIN - submenuRect.height - menuRect.top;
    const nextTop = clamp(openSubmenu.offsetTop, minTop, Math.max(minTop, maxTop));
    if (Math.abs(nextTop - openSubmenu.offsetTop) > 0.5) setOpenSubmenu((current) => current === null ? current : { ...current, offsetTop: nextTop });
  }, [openSubmenu]);
  const selectIndex = (index: number | null) => {
    if (index === null || !isSelectable(items[index])) {
      setSelectedIndex(null);
      return;
    }
    setSelectedIndex(index);
  };
  const closeSubmenu = (clearSelection: boolean) => {
    setOpenSubmenu(null);
    setHoverTarget("mainMenu");
    setSubmenuSafetyThresholdX(null);
    if (clearSelection) setSelectedIndex(null);
  };
  const openSubmenuAt = (index: number, trigger: SubmenuOpenTrigger) => {
    const item = items[index];
    const menu = menuRef.current;
    const triggerEl = rowRefs.current.get(index);
    if (item?.type !== "submenu" || openSubmenu?.itemIndex === index || menu === null || triggerEl === undefined) return;
    const menuRect = menu.getBoundingClientRect();
    const triggerRect = triggerEl.getBoundingClientRect();
    if (trigger === "keyboard") ignoreBlurUntilRef.current = Date.now() + BLUR_IGNORE_MS;
    setHoverTarget("mainMenu");
    setSubmenuSafetyThresholdX(null);
    setOpenSubmenu({ itemIndex: index, items: item.builder(), offsetTop: triggerRect.top - menuRect.top, flipLeft: menuRect.right + estimatedSubmenuWidth > window.innerWidth - SNAP_TO_WINDOW_MARGIN, trigger });
  };
  const confirm = (index = selectedIndex) => {
    if (index === null) return;
    const item = items[index];
    if (item === undefined || !isSelectable(item)) return;
    if (item.type === "submenu") {
      openSubmenuAt(index, "keyboard");
      return;
    }
    if (item.type === "entry") {
      if (item.entry.onSelect) item.entry.onSelect();
      else item.entry.action?.run();
    } else if (item.type === "custom") item.onSelect?.();
    if (keepOpenOnConfirm) closeSubmenu(false);
    else onDismiss?.();
  };
  const secondaryConfirm = (index = selectedIndex) => {
    if (index === null) return;
    const item = items[index];
    if (item === undefined || !isSelectable(item)) return;
    if (item.type === "entry") {
      if (item.entry.onSecondarySelect) item.entry.onSecondarySelect();
      else if (item.entry.onSelect) item.entry.onSelect();
      else item.entry.action?.run();
    } else if (item.type === "custom") item.onSelect?.();
    if (!keepOpenOnConfirm) onDismiss?.();
  };
  const cancel = () => {
    if (__submenuDepth > 0) {
      __onCancelSubmenu?.();
      __onRequestParentFocus?.();
      return;
    }
    onDismiss?.();
  };
  const selectByOffset = (offset: number) => {
    if (selectableIndexes.length === 0) return;
    const currentPosition = selectedIndex === null ? -1 : selectableIndexes.indexOf(selectedIndex);
    selectIndex(selectableIndexes[(currentPosition + offset + selectableIndexes.length) % selectableIndexes.length]);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectByOffset(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectByOffset(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectIndex(selectableIndexes[0] ?? null);
    } else if (event.key === "End") {
      event.preventDefault();
      selectIndex(selectableIndexes[selectableIndexes.length - 1] ?? null);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (selectedIndex !== null && items[selectedIndex]?.type === "submenu") openSubmenuAt(selectedIndex, "keyboard");
    } else if (event.key === "ArrowLeft" || event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      confirm();
    }
  };
  const setRowRef = (index: number, node: HTMLDivElement | null) => {
    if (node !== null) rowRefs.current.set(index, node);
    else rowRefs.current.delete(index);
  };
  const pointerInPaddedSubmenu = (clientX: number, clientY: number) => {
    const submenuRect = submenuContainerRef.current?.getBoundingClientRect();
    return submenuRect !== undefined && rectContainsPoint(inflateRect(submenuRect, SUBMENU_PADDING), clientX, clientY);
  };
  const renderEntry = (entry: ContextMenuEntry, index: number) => {
    const selected = selectedIndex === index;
    const disabled = Boolean(entry.disabled);
    const iconPosition = entry.iconPosition ?? "start";
    const shortcut = entry.shortcut ?? entry.action?.shortcut;
    const hasInfo = Boolean(entry.documentationAside && disabled);
    const hasEnd = shortcut !== undefined || hasInfo || entry.endSlot !== undefined;
    return (
      <div key={index} ref={(node) => setRowRef(index, node)} className={rowClassName("cm-child", selected, disabled, hasEnd)} onMouseEnter={(event) => {
        if (!disabled) {
          selectIndex(null);
          menuRef.current?.focus();
          if (openSubmenu !== null && openSubmenu.itemIndex !== index) closeSubmenu(false);
          setSelectedIndex(index);
        }
        if (__submenuDepth > 0 && submenuSafetyThresholdX !== null && event.clientX < submenuSafetyThresholdX) closeSubmenu(true);
      }} onClick={() => { if (!disabled) confirm(index); }} onContextMenu={(event) => { event.preventDefault(); if (!disabled) secondaryConfirm(index); }}>
        <div className="cm-item">
          <span className="cm-main">
            {entry.toggle?.position === "start" && <span className={joinClassNames(["cm-check", entry.toggle.checked ? false : "cm-invisible"])}>✓</span>}
            {entry.icon && iconPosition === "start" && !entry.toggle && <span className="cm-icon">{entry.icon}</span>}
            <span className="cm-label">{entry.label}</span>
            {entry.icon && iconPosition === "end" && <span className="cm-icon">{entry.icon}</span>}
            {entry.toggle?.position === "end" && <span className={joinClassNames(["cm-check", entry.toggle.checked ? false : "cm-invisible"])}>✓</span>}
          </span>
          {hasEnd && <span className="cm-end">{shortcut !== undefined && <span className="cm-shortcut">{shortcut}</span>}{hasInfo && <span className="cm-info">ⓘ</span>}{entry.endSlot !== undefined && <button className={joinClassNames(["cm-end-slot", entry.showEndSlotOnHover ? "cm-end-slot-hover" : false])} type="button" title={entry.endSlotTitle} onClick={(event) => { event.stopPropagation(); entry.onSecondarySelect?.(); }}>{entry.endSlot}</button>}</span>}
        </div>
      </div>
    );
  };
  const renderMenuItem = (item: ContextMenuItem, index: number) => {
    if (item.type === "separator") return <div key={index} className="cm-separator" />;
    if (item.type === "header") return <div key={index} className="cm-subheader">{item.label}</div>;
    if (item.type === "headerWithLink") return <div key={index} className="cm-subheader cm-subheader-with-link"><span>{item.label}</span><a className="cm-header-link" href={item.linkUrl} target="_blank" rel="noreferrer">{item.linkLabel}</a></div>;
    if (item.type === "label") return <div key={index} className="cm-child cm-child-disabled"><div className="cm-item cm-item-disabled"><span className="cm-label">{item.label}</span></div></div>;
    if (item.type === "entry") return renderEntry(item.entry, index);
    if (item.type === "custom") {
      const selectable = item.selectable ?? true;
      return <div key={index} ref={(node) => setRowRef(index, node)} className={rowClassName("cm-child", selectedIndex === index, !selectable)} onMouseEnter={() => { if (selectable) selectIndex(index); if (openSubmenu !== null && openSubmenu.itemIndex !== index) closeSubmenu(false); }} onClick={() => { if (!selectable) return; item.onSelect?.(); if (!keepOpenOnConfirm) onDismiss?.(); }}><div className="cm-item">{item.render()}</div></div>;
    }
    const selected = selectedIndex === index || openSubmenu?.itemIndex === index;
    return (
      <div key={index} ref={(node) => setRowRef(index, node)} className={rowClassName("cm-submenu-trigger", selected)} onMouseDown={(event) => { if (event.button === 0) setSubmenuTriggerMouseDown(true); }} onMouseUp={(event) => { if (event.button === 0) setSubmenuTriggerMouseDown(false); }} onMouseMove={(event) => { if (openSubmenu !== null || selectedIndex === index) setSubmenuSafetyThresholdX(event.clientX - 100); }} onMouseEnter={(event) => { selectIndex(null); menuRef.current?.focus(); setHoverTarget("mainMenu"); setSubmenuSafetyThresholdX(event.clientX - 50); openSubmenuAt(index, "pointer"); }} onMouseLeave={(event) => { if (submenuTriggerMouseDown) return; if (openSubmenu?.itemIndex === index && hoverTarget !== "submenu" && !pointerInPaddedSubmenu(event.clientX, event.clientY)) { closeSubmenu(false); selectIndex(null); menuRef.current?.focus(); } }} onClick={() => { if (openSubmenu?.itemIndex !== index) openSubmenuAt(index, "pointer"); }}>
        <div className="cm-item"><span className="cm-main">{item.icon && <span className="cm-icon" style={{ color: item.iconColor }}>{item.icon}</span>}<span className="cm-label">{item.label}</span></span><span className="cm-end cm-end-chevron"><span className="cm-chevron">›</span></span></div>
      </div>
    );
  };
  const fixedWidthStyle = typeof fixedWidth === "number" ? `${fixedWidth}px` : fixedWidth;
  const isWideWindow = typeof window !== "undefined" ? window.innerWidth > WIDE_WINDOW_MIN_WIDTH : true;
  return <div ref={wrapperRef} className={joinClassNames(["cm-wrapper", className])} style={style} onMouseEnter={() => setHoverTarget("mainMenu")}><div ref={menuRef} className="cm-menu" tabIndex={0} data-depth={__submenuDepth} style={{ width: fixedWidthStyle, minWidth: fixedWidthStyle ? undefined : DEFAULT_MENU_MIN_WIDTH }} onKeyDown={handleKeyDown} onBlur={() => { if (Date.now() < ignoreBlurUntilRef.current) return; }} onMouseDown={(event) => event.stopPropagation()}>{items.map((item, index) => renderMenuItem(item, index))}</div>{documentationAside && <div className={joinClassNames(["cm-aside", documentationAside.aside.side === "left" ? "cm-aside-left" : "cm-aside-right", isWideWindow ? "cm-aside-wide" : "cm-aside-narrow"])} style={{ top: isWideWindow ? documentationAside.top : undefined, minHeight: isWideWindow ? documentationAside.height : undefined }}>{documentationAside.aside.render()}</div>}{openSubmenu && <div ref={submenuContainerRef} className="cm-submenu-container" style={{ top: openSubmenu.offsetTop, left: openSubmenu.flipLeft ? undefined : "calc(100% - 2px)", right: openSubmenu.flipLeft ? "calc(100% - 2px)" : undefined }} onMouseEnter={() => setHoverTarget("submenu")} onMouseMove={(event) => { if (submenuSafetyThresholdX !== null && event.clientX < submenuSafetyThresholdX) return; setHoverTarget("submenu"); }} onMouseLeave={(event) => { if (!pointerInPaddedSubmenu(event.clientX, event.clientY)) closeSubmenu(true); }}><ContextMenu items={openSubmenu.items} keepOpenOnConfirm={keepOpenOnConfirm} onDismiss={onDismiss} autoFocus={openSubmenu.trigger === "keyboard"} estimatedSubmenuWidth={estimatedSubmenuWidth} __submenuDepth={__submenuDepth + 1} __onCancelSubmenu={() => closeSubmenu(false)} __onRequestParentFocus={() => { menuRef.current?.focus(); if (openSubmenu !== null) selectIndex(openSubmenu.itemIndex); }} /></div>}</div>;
};

export { ContextMenu, ContextMenuBuilder };
export type { ContextMenuEntry, ContextMenuItem, ContextMenuProps, DocumentationAside, DocumentationSide, HoverTarget, IconPosition, MenuAction, SubmenuOpenTrigger };
