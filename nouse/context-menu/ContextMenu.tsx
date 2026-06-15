import React, {
  CSSProperties,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./ContextMenu.css";

export type IconPosition = "start" | "end";
export type DocumentationSide = "left" | "right";
export type SubmenuOpenTrigger = "pointer" | "keyboard";
export type HoverTarget = "none" | "mainMenu" | "submenu";

export type MenuAction = {
  id: string;
  shortcut?: string;
  run: () => void;
};

export type DocumentationAside = {
  side: DocumentationSide;
  render: () => ReactNode;
};

export type ContextMenuEntry = {
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

export type ContextMenuItem =
  | { type: "separator" }
  | { type: "header"; label: string }
  | { type: "headerWithLink"; label: string; linkLabel: string; linkUrl: string }
  | { type: "label"; label: string }
  | { type: "entry"; entry: ContextMenuEntry }
  | {
      type: "custom";
      render: () => ReactNode;
      selectable?: boolean;
      documentationAside?: DocumentationAside;
      onSelect?: () => void;
    }
  | {
      type: "submenu";
      label: string;
      icon?: ReactNode;
      iconColor?: string;
      builder: () => ContextMenuItem[];
    };

export class ContextMenuBuilder {
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
    this.items.push({
      type: "entry",
      entry: {
        label,
        action: action ?? undefined,
        shortcut: action?.shortcut,
        iconPosition: "end",
        onSelect,
      },
    });
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

  actionCheckedWithDisabled(
    label: string,
    action: MenuAction,
    checked: boolean,
    disabled: boolean,
  ): this {
    this.items.push({
      type: "entry",
      entry: {
        label,
        action,
        shortcut: action.shortcut,
        disabled,
        iconPosition: "end",
        toggle: checked ? { position: "start", checked: true } : undefined,
        onSelect: action.run,
      },
    });
    return this;
  }

  actionDisabledWhen(disabled: boolean, label: string, action: MenuAction): this {
    this.items.push({
      type: "entry",
      entry: {
        label,
        action,
        shortcut: action.shortcut,
        disabled,
        iconPosition: "end",
        onSelect: action.run,
      },
    });
    return this;
  }

  link(label: string, action: MenuAction): this {
    return this.linkWithHandler(label, action, () => undefined);
  }

  linkWithHandler(label: string, action: MenuAction, handler: () => void): this {
    this.items.push({
      type: "entry",
      entry: {
        label,
        action,
        shortcut: action.shortcut,
        icon: "↗",
        iconPosition: "end",
        onSelect: () => {
          handler();
          action.run();
        },
      },
    });
    return this;
  }

  toggleableEntry(
    label: string,
    toggled: boolean,
    position: IconPosition,
    action: MenuAction | null,
    onSelect: () => void,
  ): this {
    this.items.push({
      type: "entry",
      entry: {
        label,
        action: action ?? undefined,
        shortcut: action?.shortcut,
        iconPosition: position,
        toggle: { position, checked: toggled },
        onSelect,
      },
    });
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

  customEntryWithDocs(
    render: () => ReactNode,
    onSelect: () => void,
    documentationAside?: DocumentationAside,
  ): this {
    this.items.push({
      type: "custom",
      render,
      selectable: true,
      onSelect,
      documentationAside,
    });
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

  submenuWithColoredIcon(
    label: string,
    icon: ReactNode,
    iconColor: string,
    builder: () => ContextMenuItem[],
  ): this {
    this.items.push({ type: "submenu", label, icon, iconColor, builder });
    return this;
  }
}

type OpenSubmenu = {
  itemIndex: number;
  items: ContextMenuItem[];
  offsetTop: number;
  flipLeft: boolean;
  trigger: SubmenuOpenTrigger;
};

export type ContextMenuProps = {
  items: ContextMenuItem[];
  fixedWidth?: number | string;
  keepOpenOnConfirm?: boolean;
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
  autoFocus?: boolean;
  estimatedSubmenuWidth?: number;

  /** Internal props used by nested submenus. */
  __submenuDepth?: number;
  __onCancelSubmenu?: () => void;
  __onRequestParentFocus?: () => void;
};

function isSelectable(item: ContextMenuItem): boolean {
  switch (item.type) {
    case "header":
    case "headerWithLink":
    case "separator":
    case "label":
      return false;
    case "entry":
      return !item.entry.disabled;
    case "custom":
      return item.selectable ?? true;
    case "submenu":
      return true;
  }
}

function getAside(item: ContextMenuItem | undefined): DocumentationAside | null {
  if (!item) return null;
  if (item.type === "entry") return item.entry.documentationAside ?? null;
  if (item.type === "custom") return item.documentationAside ?? null;
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function inflateRect(rect: DOMRect, amount: number): DOMRect {
  return new DOMRect(
    rect.x - amount,
    rect.y - amount,
    rect.width + amount * 2,
    rect.height + amount * 2,
  );
}

function rectContainsPoint(rect: DOMRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function ContextMenu({
  items,
  fixedWidth,
  keepOpenOnConfirm = false,
  onDismiss,
  className,
  style,
  autoFocus = true,
  estimatedSubmenuWidth = 220,
  __submenuDepth = 0,
  __onCancelSubmenu,
  __onRequestParentFocus,
}: ContextMenuProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const submenuContainerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<OpenSubmenu | null>(null);
  const [documentationAside, setDocumentationAside] = useState<{
    index: number;
    aside: DocumentationAside;
    top: number;
    height: number;
  } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>("mainMenu");
  const [submenuSafetyThresholdX, setSubmenuSafetyThresholdX] = useState<number | null>(null);
  const [submenuTriggerMouseDown, setSubmenuTriggerMouseDown] = useState(false);
  const ignoreBlurUntilRef = useRef(0);

  const selectableIndexes = useMemo(
    () => items.map((item, ix) => (isSelectable(item) ? ix : -1)).filter((ix) => ix >= 0),
    [items],
  );

  useEffect(() => {
    if (autoFocus) {
      queueMicrotask(() => menuRef.current?.focus());
    }
  }, [autoFocus]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && wrapperRef.current?.contains(target)) return;

      if (openSubmenu) {
        const submenuRect = submenuContainerRef.current?.getBoundingClientRect();
        if (submenuRect && rectContainsPoint(inflateRect(submenuRect, 50), event.clientX, event.clientY)) {
          return;
        }
      }

      onDismiss?.();
    }

    document.addEventListener("mousedown", onPointerDown, true);
    return () => document.removeEventListener("mousedown", onPointerDown, true);
  }, [onDismiss, openSubmenu]);

  useEffect(() => {
    const item = selectedIndex == null ? undefined : items[selectedIndex];
    const aside = getAside(item);
    const row = selectedIndex == null ? null : rowRefs.current.get(selectedIndex);
    const menu = menuRef.current;

    if (!aside || !row || !menu) {
      setDocumentationAside(null);
      return;
    }

    const rowRect = row.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    setDocumentationAside({
      index: selectedIndex,
      aside,
      top: rowRect.top - menuRect.top,
      height: rowRect.height,
    });
  }, [selectedIndex, items]);

  useLayoutEffect(() => {
    if (!openSubmenu) return;

    const menu = menuRef.current;
    const submenu = submenuContainerRef.current;
    if (!menu || !submenu) return;

    const menuRect = menu.getBoundingClientRect();
    const submenuRect = submenu.getBoundingClientRect();
    const margin = 8;

    const minTop = margin - menuRect.top;
    const maxTop = window.innerHeight - margin - submenuRect.height - menuRect.top;
    const nextTop = clamp(openSubmenu.offsetTop, minTop, Math.max(minTop, maxTop));

    if (Math.abs(nextTop - openSubmenu.offsetTop) > 0.5) {
      setOpenSubmenu((current) =>
        current ? { ...current, offsetTop: nextTop } : current,
      );
    }
  }, [openSubmenu]);

  function selectIndex(ix: number | null) {
    if (ix == null || !isSelectable(items[ix])) {
      setSelectedIndex(null);
      return;
    }

    setSelectedIndex(ix);
  }

  function selectFirst() {
    selectIndex(selectableIndexes[0] ?? null);
  }

  function selectLast() {
    selectIndex(selectableIndexes[selectableIndexes.length - 1] ?? null);
  }

  function selectNext() {
    if (selectableIndexes.length === 0) return;
    if (selectedIndex == null) {
      selectFirst();
      return;
    }

    const currentPosition = selectableIndexes.indexOf(selectedIndex);
    const nextPosition =
      currentPosition < 0 || currentPosition === selectableIndexes.length - 1
        ? 0
        : currentPosition + 1;

    selectIndex(selectableIndexes[nextPosition]);
  }

  function selectPrevious() {
    if (selectableIndexes.length === 0) return;
    if (selectedIndex == null) {
      selectLast();
      return;
    }

    const currentPosition = selectableIndexes.indexOf(selectedIndex);
    const previousPosition =
      currentPosition <= 0 ? selectableIndexes.length - 1 : currentPosition - 1;

    selectIndex(selectableIndexes[previousPosition]);
  }

  function closeSubmenu(clearSelection: boolean) {
    setOpenSubmenu(null);
    setHoverTarget("mainMenu");
    setSubmenuSafetyThresholdX(null);
    if (clearSelection) setSelectedIndex(null);
  }

  function openSubmenuAt(index: number, trigger: SubmenuOpenTrigger) {
    const item = items[index];
    if (item?.type !== "submenu") return;

    if (openSubmenu?.itemIndex === index) return;

    const menu = menuRef.current;
    const triggerEl = rowRefs.current.get(index);
    if (!menu || !triggerEl) return;

    const menuRect = menu.getBoundingClientRect();
    const triggerRect = triggerEl.getBoundingClientRect();
    const offsetTop = triggerRect.top - menuRect.top;
    const flipLeft = menuRect.right + estimatedSubmenuWidth > window.innerWidth - 8;

    if (trigger === "keyboard") {
      ignoreBlurUntilRef.current = Date.now() + 150;
    }

    setHoverTarget("mainMenu");
    setSubmenuSafetyThresholdX(null);
    setOpenSubmenu({
      itemIndex: index,
      items: item.builder(),
      offsetTop,
      flipLeft,
      trigger,
    });
  }

  function confirm(index = selectedIndex) {
    if (index == null) return;

    const item = items[index];
    if (!item || !isSelectable(item)) return;

    if (item.type === "submenu") {
      openSubmenuAt(index, "keyboard");
      return;
    }

    if (item.type === "entry") {
      if (item.entry.onSelect) {
        item.entry.onSelect();
      } else {
        item.entry.action?.run();
      }
    } else if (item.type === "custom") {
      item.onSelect?.();
    }

    if (keepOpenOnConfirm) {
      closeSubmenu(false);
    } else {
      onDismiss?.();
    }
  }

  function secondaryConfirm(index = selectedIndex) {
    if (index == null) return;

    const item = items[index];
    if (!item || !isSelectable(item)) return;

    if (item.type === "submenu") {
      openSubmenuAt(index, "keyboard");
      return;
    }

    if (item.type === "entry") {
      if (item.entry.onSecondarySelect) {
        item.entry.onSecondarySelect();
      } else if (item.entry.onSelect) {
        item.entry.onSelect();
      } else {
        item.entry.action?.run();
      }
    } else if (item.type === "custom") {
      item.onSelect?.();
    }

    if (!keepOpenOnConfirm) {
      onDismiss?.();
    }
  }

  function cancel() {
    if (__submenuDepth > 0) {
      __onCancelSubmenu?.();
      __onRequestParentFocus?.();
      return;
    }

    onDismiss?.();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectNext();
        break;
      case "ArrowUp":
        event.preventDefault();
        selectPrevious();
        break;
      case "Home":
        event.preventDefault();
        selectFirst();
        break;
      case "End":
        event.preventDefault();
        selectLast();
        break;
      case "ArrowRight":
        event.preventDefault();
        if (selectedIndex != null && items[selectedIndex]?.type === "submenu") {
          openSubmenuAt(selectedIndex, "keyboard");
        }
        break;
      case "ArrowLeft":
        event.preventDefault();
        cancel();
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        confirm();
        break;
      case "Escape":
        event.preventDefault();
        cancel();
        break;
      default:
        break;
    }
  }

  function setRowRef(index: number, node: HTMLDivElement | null) {
    if (node) rowRefs.current.set(index, node);
    else rowRefs.current.delete(index);
  }

  function pointerInPaddedSubmenu(clientX: number, clientY: number): boolean {
    const submenuRect = submenuContainerRef.current?.getBoundingClientRect();
    if (!submenuRect) return false;
    return rectContainsPoint(inflateRect(submenuRect, 50), clientX, clientY);
  }

  function renderMenuItem(item: ContextMenuItem, index: number) {
    switch (item.type) {
      case "separator":
        return <div key={index} className="cm-separator" />;

      case "header":
        return (
          <div key={index} className="cm-subheader">
            {item.label}
          </div>
        );

      case "headerWithLink":
        return (
          <div key={index} className="cm-subheader cm-subheader-with-link">
            <span>{item.label}</span>
            <button
              className="cm-header-link"
              type="button"
              onClick={() => window.open(item.linkUrl, "_blank", "noopener,noreferrer")}
            >
              {item.linkLabel}
            </button>
          </div>
        );

      case "label":
        return (
          <div key={index} className="cm-item cm-item-disabled">
            <span className="cm-label">{item.label}</span>
          </div>
        );

      case "custom": {
        const selectable = item.selectable ?? true;

        return (
          <div
            key={index}
            ref={(node) => setRowRef(index, node)}
            className={[
              "cm-child",
              selectable ? "cm-child-selectable" : "",
              selectedIndex === index ? "cm-selected" : "",
            ].join(" ")}
            onMouseEnter={() => {
              if (selectable) selectIndex(index);
              if (openSubmenu && openSubmenu.itemIndex !== index) closeSubmenu(false);
            }}
            onClick={() => {
              if (!selectable) return;
              item.onSelect?.();
              if (!keepOpenOnConfirm) onDismiss?.();
            }}
          >
            <div className="cm-item">{item.render()}</div>
          </div>
        );
      }

      case "submenu": {
        const selected = selectedIndex === index || openSubmenu?.itemIndex === index;

        return (
          <div
            key={index}
            ref={(node) => setRowRef(index, node)}
            className="cm-submenu-trigger"
            onMouseDown={(event) => {
              if (event.button === 0) setSubmenuTriggerMouseDown(true);
            }}
            onMouseUp={(event) => {
              if (event.button === 0) setSubmenuTriggerMouseDown(false);
            }}
            onMouseMove={(event) => {
              if (openSubmenu || selectedIndex === index) {
                setSubmenuSafetyThresholdX(event.clientX - 100);
              }
            }}
            onMouseEnter={(event) => {
              selectIndex(null);
              menuRef.current?.focus();
              setHoverTarget("mainMenu");
              setSubmenuSafetyThresholdX(event.clientX - 50);
              openSubmenuAt(index, "pointer");
            }}
            onMouseLeave={(event) => {
              if (submenuTriggerMouseDown) return;

              const isOpenForThisItem = openSubmenu?.itemIndex === index;
              if (
                isOpenForThisItem &&
                hoverTarget !== "submenu" &&
                !pointerInPaddedSubmenu(event.clientX, event.clientY)
              ) {
                closeSubmenu(false);
                selectIndex(null);
                menuRef.current?.focus();
              }
            }}
            onClick={() => {
              if (openSubmenu?.itemIndex !== index) {
                openSubmenuAt(index, "pointer");
              }
            }}
          >
            <div className={["cm-item", selected ? "cm-selected" : ""].join(" ")}>
              <span className="cm-main">
                {item.icon && (
                  <span className="cm-icon" style={{ color: item.iconColor }}>
                    {item.icon}
                  </span>
                )}
                <span className="cm-label">{item.label}</span>
              </span>
              <span className="cm-chevron">›</span>
            </div>
          </div>
        );
      }

      case "entry": {
        const entry = item.entry;
        const selected = selectedIndex === index;
        const disabled = Boolean(entry.disabled);
        const iconPosition = entry.iconPosition ?? "start";
        const toggle = entry.toggle;

        const labelElement = (
          <span className="cm-main">
            {toggle?.position === "start" && (
              <span className={["cm-check", toggle.checked ? "" : "cm-invisible"].join(" ")}>
                ✓
              </span>
            )}

            {entry.icon && iconPosition === "start" && !toggle && (
              <span className="cm-icon">{entry.icon}</span>
            )}

            <span className="cm-label">{entry.label}</span>

            {entry.icon && iconPosition === "end" && (
              <span className="cm-icon">{entry.icon}</span>
            )}

            {toggle?.position === "end" && (
              <span className={["cm-check", toggle.checked ? "" : "cm-invisible"].join(" ")}>
                ✓
              </span>
            )}
          </span>
        );

        return (
          <div
            key={index}
            ref={(node) => setRowRef(index, node)}
            className="cm-child"
            onMouseEnter={(event) => {
              if (!disabled) {
                selectIndex(null);
                menuRef.current?.focus();

                if (openSubmenu && openSubmenu.itemIndex !== index) {
                  closeSubmenu(false);
                }

                setSelectedIndex(index);
              }

              if (__submenuDepth > 0) {
                setHoverTarget("submenu");
                if (submenuSafetyThresholdX != null && event.clientX < submenuSafetyThresholdX) {
                  closeSubmenu(true);
                }
              }
            }}
            onClick={() => {
              if (!disabled) confirm(index);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              if (!disabled) secondaryConfirm(index);
            }}
          >
            <div
              className={[
                "cm-item",
                selected ? "cm-selected" : "",
                disabled ? "cm-item-disabled" : "",
                entry.endSlot ? "cm-item-has-end-slot" : "",
              ].join(" ")}
            >
              {labelElement}

              <span className="cm-end">
                {(entry.shortcut || entry.action?.shortcut) && (
                  <span className="cm-shortcut">{entry.shortcut ?? entry.action?.shortcut}</span>
                )}

                {entry.documentationAside && disabled && (
                  <span className="cm-info">ⓘ</span>
                )}

                {entry.endSlot && (
                  <button
                    className={[
                      "cm-end-slot",
                      entry.showEndSlotOnHover ? "cm-end-slot-hover" : "",
                    ].join(" ")}
                    type="button"
                    title={entry.endSlotTitle}
                    onClick={(event) => {
                      event.stopPropagation();
                      entry.onSecondarySelect?.();
                    }}
                  >
                    {entry.endSlot}
                  </button>
                )}
              </span>
            </div>
          </div>
        );
      }
    }
  }

  const fixedWidthStyle =
    typeof fixedWidth === "number" ? `${fixedWidth}px` : fixedWidth;

  const isWideWindow =
    typeof window !== "undefined" ? window.innerWidth > 800 : true;

  return (
    <div
      ref={wrapperRef}
      className={["cm-wrapper", className ?? ""].join(" ")}
      style={style}
      onMouseEnter={() => setHoverTarget("mainMenu")}
    >
      <div
        ref={menuRef}
        className="cm-menu"
        tabIndex={0}
        data-depth={__submenuDepth}
        style={{
          width: fixedWidthStyle,
          minWidth: fixedWidthStyle ? undefined : 200,
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (Date.now() < ignoreBlurUntilRef.current) return;
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        {items.map((item, index) => renderMenuItem(item, index))}
      </div>

      {documentationAside && (
        <div
          className={[
            "cm-aside",
            documentationAside.aside.side === "left" ? "cm-aside-left" : "cm-aside-right",
            isWideWindow ? "cm-aside-wide" : "cm-aside-narrow",
          ].join(" ")}
          style={{
            top: isWideWindow ? documentationAside.top : undefined,
            minHeight: isWideWindow ? documentationAside.height : undefined,
          }}
        >
          {documentationAside.aside.render()}
        </div>
      )}

      {openSubmenu && (
        <div
          ref={submenuContainerRef}
          className="cm-submenu-container"
          style={{
            top: openSubmenu.offsetTop,
            left: openSubmenu.flipLeft ? undefined : "calc(100% - 2px)",
            right: openSubmenu.flipLeft ? "calc(100% - 2px)" : undefined,
          }}
          onMouseEnter={() => setHoverTarget("submenu")}
          onMouseMove={(event) => {
            if (submenuSafetyThresholdX != null && event.clientX < submenuSafetyThresholdX) {
              return;
            }
            setHoverTarget("submenu");
          }}
          onMouseLeave={(event) => {
            if (!pointerInPaddedSubmenu(event.clientX, event.clientY)) {
              closeSubmenu(true);
            }
          }}
        >
          <ContextMenu
            items={openSubmenu.items}
            keepOpenOnConfirm={keepOpenOnConfirm}
            onDismiss={onDismiss}
            autoFocus={openSubmenu.trigger === "keyboard"}
            estimatedSubmenuWidth={estimatedSubmenuWidth}
            __submenuDepth={__submenuDepth + 1}
            __onCancelSubmenu={() => closeSubmenu(false)}
            __onRequestParentFocus={() => {
              menuRef.current?.focus();
              if (openSubmenu) selectIndex(openSubmenu.itemIndex);
            }}
          />
        </div>
      )}
    </div>
  );
}
