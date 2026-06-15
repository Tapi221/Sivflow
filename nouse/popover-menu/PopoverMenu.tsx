import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import "@/nouse/popover-menu/PopoverMenu.css";

type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "left-center"
  | "right-center";
type Point = {
  x: number;
  y: number;
};
type MenuBuilder = () => ReactNode | null;
type PopoverMenuDismissReason = "manual" | "outside-pointer-down" | "escape" | "trigger-mouse-down";
type PopoverMenuHandleState = {
  show: () => void;
  hide: (reason?: PopoverMenuDismissReason) => void;
  toggle: () => void;
  isDeployed: () => boolean;
  isFocused: () => boolean;
  refreshMenu: (menuBuilder: MenuBuilder) => void;
};
type PopoverTriggerRenderProps = {
  open: boolean;
  toggle: () => void;
  show: () => void;
  hide: () => void;
  triggerProps: {
    "aria-controls": string | undefined;
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
    onClick: (event: ReactMouseEvent) => void;
    onMouseDown: (event: ReactMouseEvent) => void;
  };
};
type PopoverMenuProps = {
  id: string;
  menu: MenuBuilder;
  children: (props: PopoverTriggerRenderProps) => ReactNode;
  handle?: PopoverMenuHandle;
  anchor?: Anchor;
  attach?: Anchor;
  offset?: Point;
  fullWidth?: boolean;
  onOpen?: () => void;
  onDismiss?: (reason: PopoverMenuDismissReason) => void;
  portal?: HTMLElement | null;
  className?: string;
  style?: CSSProperties;
  menuClassName?: string;
  menuStyle?: CSSProperties;
  closeOnOutsidePointerDown?: boolean;
  closeOnEscape?: boolean;
  restoreFocusOnDismiss?: boolean;
  snapToWindowMargin?: number;
};
type CloseOptions = {
  reason: PopoverMenuDismissReason;
};
type UsePopoverMenuPositionOptions = {
  anchor?: Anchor;
  attach?: Anchor;
  offset?: Point;
  snapToWindowMargin?: number;
};

const DEFAULT_SNAP_TO_WINDOW_MARGIN = 8;
const MENU_LAYER_Z_INDEX = 1000;
const DEFAULT_OFFSET_PX = 5;

class PopoverMenuHandle {
  private state: PopoverMenuHandleState | null = null;
  _attach(state: PopoverMenuHandleState | null) {
    this.state = state;
  }
  show() {
    this.state?.show();
  }
  hide() {
    this.state?.hide("manual");
  }
  toggle() {
    this.state?.toggle();
  }
  isDeployed() {
    return this.state?.isDeployed() ?? false;
  }
  isFocused() {
    return this.state?.isFocused() ?? false;
  }
  refreshMenu(menuBuilder: MenuBuilder) {
    this.state?.refreshMenu(menuBuilder);
  }
}

const usePopoverMenuHandle = () => {
  return useMemo(() => new PopoverMenuHandle(), []);
};
const joinClassNames = (classNames: Array<string | false | null | undefined>) => {
  return classNames.filter(Boolean).join(" ");
};
const isHTMLElement = (value: Element | null): value is HTMLElement => {
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
};
const oppositeAttachForAnchor = (anchor: Anchor): Anchor => {
  switch (anchor) {
    case "top-left":
      return "bottom-left";
    case "top-center":
      return "bottom-center";
    case "top-right":
      return "bottom-right";
    case "bottom-left":
      return "top-left";
    case "bottom-center":
      return "top-center";
    case "bottom-right":
      return "top-right";
    case "left-center":
      return "left-center";
    case "right-center":
      return "right-center";
  }
};
const defaultOffset = (anchor: Anchor): Point => {
  switch (anchor) {
    case "top-right":
    case "bottom-right":
    case "right-center":
      return { x: DEFAULT_OFFSET_PX, y: 0 };
    case "top-left":
    case "bottom-left":
    case "left-center":
      return { x: -DEFAULT_OFFSET_PX, y: 0 };
    case "top-center":
    case "bottom-center":
      return { x: 0, y: 0 };
  }
};
const pointForAnchor = (rect: DOMRect, anchor: Anchor): Point => {
  switch (anchor) {
    case "top-left":
      return { x: rect.left, y: rect.top };
    case "top-center":
      return { x: rect.left + rect.width / 2, y: rect.top };
    case "top-right":
      return { x: rect.right, y: rect.top };
    case "bottom-left":
      return { x: rect.left, y: rect.bottom };
    case "bottom-center":
      return { x: rect.left + rect.width / 2, y: rect.bottom };
    case "bottom-right":
      return { x: rect.right, y: rect.bottom };
    case "left-center":
      return { x: rect.left, y: rect.top + rect.height / 2 };
    case "right-center":
      return { x: rect.right, y: rect.top + rect.height / 2 };
  }
};
const menuOriginForAnchor = (menuRect: DOMRect, anchor: Anchor): Point => {
  switch (anchor) {
    case "top-left":
      return { x: 0, y: 0 };
    case "top-center":
      return { x: menuRect.width / 2, y: 0 };
    case "top-right":
      return { x: menuRect.width, y: 0 };
    case "bottom-left":
      return { x: 0, y: menuRect.height };
    case "bottom-center":
      return { x: menuRect.width / 2, y: menuRect.height };
    case "bottom-right":
      return { x: menuRect.width, y: menuRect.height };
    case "left-center":
      return { x: 0, y: menuRect.height / 2 };
    case "right-center":
      return { x: menuRect.width, y: menuRect.height / 2 };
  }
};
const snapToWindow = (x: number, y: number, rect: DOMRect, margin: number): Point => {
  if (typeof window === "undefined") return { x, y };
  const maxX = window.innerWidth - rect.width - margin;
  const maxY = window.innerHeight - rect.height - margin;
  return {
    x: Math.min(Math.max(x, margin), Math.max(margin, maxX)),
    y: Math.min(Math.max(y, margin), Math.max(margin, maxY)),
  };
};
const getResolvedAttach = (anchor: Anchor, attach: Anchor | undefined): Anchor => {
  return attach ?? oppositeAttachForAnchor(anchor);
};
const getResolvedOffset = (anchor: Anchor, offset: Point | undefined): Point => {
  return offset ?? defaultOffset(anchor);
};
const useLatest = <T,>(value: T) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

const PopoverMenu = ({
  id,
  menu,
  children,
  handle,
  anchor = "top-left",
  attach,
  offset,
  fullWidth = false,
  onOpen,
  onDismiss,
  portal,
  className,
  style,
  menuClassName,
  menuStyle,
  closeOnOutsidePointerDown = true,
  closeOnEscape = true,
  restoreFocusOnDismiss = true,
  snapToWindowMargin = DEFAULT_SNAP_TO_WINDOW_MARGIN,
}: PopoverMenuProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const menuNodeRef = useRef<ReactNode | null>(null);
  const justClosedByTriggerMouseDownRef = useRef(false);
  const menuBuilderRef = useLatest(menu);
  const onOpenRef = useLatest(onOpen);
  const onDismissRef = useLatest(onDismiss);
  const [open, setOpen] = useState(false);
  const [menuNode, setMenuNode] = useState<ReactNode | null>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const resolvedAttach = getResolvedAttach(anchor, attach);
  const resolvedOffset = useMemo(() => getResolvedOffset(anchor, offset), [anchor, offset]);
  openRef.current = open;
  menuNodeRef.current = menuNode;
  const shouldRestoreFocusToPrevious = useCallback(() => {
    if (!restoreFocusOnDismiss) return false;
    const activeElement = typeof document === "undefined" ? null : document.activeElement;
    return Boolean(activeElement && menuRef.current?.contains(activeElement));
  }, [restoreFocusOnDismiss]);
  const close = useCallback(
    ({ reason }: CloseOptions) => {
      const wasOpen = openRef.current;
      const shouldRestoreFocus = shouldRestoreFocusToPrevious();
      openRef.current = false;
      menuNodeRef.current = null;
      setOpen(false);
      setMenuNode(null);
      setPosition(null);
      if (wasOpen) {
        onDismissRef.current?.(reason);
      }
      if (shouldRestoreFocus && previousFocusRef.current?.isConnected) {
        queueMicrotask(() => previousFocusRef.current?.focus());
      }
    },
    [onDismissRef, shouldRestoreFocusToPrevious],
  );
  const show = useCallback(() => {
    const nextMenu = menuBuilderRef.current();
    if (nextMenu === null || nextMenu === undefined) return;
    const activeElement = typeof document === "undefined" ? null : document.activeElement;
    previousFocusRef.current = isHTMLElement(activeElement) ? activeElement : null;
    openRef.current = true;
    menuNodeRef.current = nextMenu;
    setPosition(null);
    setMenuNode(nextMenu);
    setOpen(true);
    onOpenRef.current?.();
  }, [menuBuilderRef, onOpenRef]);
  const hide = useCallback(
    (reason: PopoverMenuDismissReason = "manual") => {
      close({ reason });
    },
    [close],
  );
  const toggle = useCallback(() => {
    if (openRef.current) {
      hide("manual");
      return;
    }
    show();
  }, [hide, show]);
  const refreshMenu = useCallback(
    (nextMenuBuilder: MenuBuilder) => {
      menuBuilderRef.current = nextMenuBuilder;
      if (!openRef.current) return;
      show();
    },
    [menuBuilderRef, show],
  );
  const updatePosition = useCallback(() => {
    if (!openRef.current || !triggerRef.current || !menuRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const attachPoint = pointForAnchor(triggerRect, resolvedAttach);
    const menuOrigin = menuOriginForAnchor(menuRect, anchor);
    const rawX = attachPoint.x + resolvedOffset.x - menuOrigin.x;
    const rawY = attachPoint.y + resolvedOffset.y - menuOrigin.y;
    setPosition(snapToWindow(rawX, rawY, menuRect, snapToWindowMargin));
  }, [anchor, resolvedAttach, resolvedOffset.x, resolvedOffset.y, snapToWindowMargin]);
  useEffect(() => {
    handle?._attach({
      show,
      hide,
      toggle,
      isDeployed: () => openRef.current,
      isFocused: () => {
        const activeElement = typeof document === "undefined" ? null : document.activeElement;
        return Boolean(activeElement && menuRef.current?.contains(activeElement));
      },
      refreshMenu,
    });
    return () => {
      handle?._attach(null);
    };
  }, [handle, hide, refreshMenu, show, toggle]);
  useLayoutEffect(() => {
    updatePosition();
  }, [menuNode, updatePosition]);
  useEffect(() => {
    if (!open) return;
    const firstFrame = requestAnimationFrame(() => {
      const secondFrame = requestAnimationFrame(() => {
        menuRef.current?.focus();
      });
      return () => cancelAnimationFrame(secondFrame);
    });
    return () => cancelAnimationFrame(firstFrame);
  }, [open, menuNode]);
  useEffect(() => {
    if (!open) return;
    const handleResizeOrScroll = () => {
      updatePosition();
    };
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [open, updatePosition]);
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inMenu = menuRef.current?.contains(target);
      const inTrigger = triggerRef.current?.contains(target);
      if (inMenu) return;
      if (inTrigger) {
        justClosedByTriggerMouseDownRef.current = true;
        close({ reason: "trigger-mouse-down" });
        event.stopPropagation();
        return;
      }
      if (closeOnOutsidePointerDown) {
        close({ reason: "outside-pointer-down" });
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== "Escape") return;
      event.preventDefault();
      close({ reason: "escape" });
    };
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [close, closeOnEscape, closeOnOutsidePointerDown, open]);
  const triggerProps: PopoverTriggerRenderProps["triggerProps"] = {
    "aria-controls": open ? `${id}-popover-menu` : undefined,
    "aria-expanded": open,
    "aria-haspopup": "menu",
    onMouseDown: () => {
      if (!openRef.current) {
        justClosedByTriggerMouseDownRef.current = false;
      }
    },
    onClick: (event) => {
      if (justClosedByTriggerMouseDownRef.current) {
        justClosedByTriggerMouseDownRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      show();
    },
  };
  const target = portal ?? (typeof document !== "undefined" ? document.body : null);
  const renderedMenu = open && target
    ? createPortal(
      <div
        id={`${id}-popover-menu`}
        ref={menuRef}
        className={joinClassNames(["pm-menu-layer", menuClassName])}
        role="menu"
        tabIndex={-1}
        style={{
          visibility: position ? "visible" : "hidden",
          left: position?.x ?? 0,
          top: position?.y ?? 0,
          zIndex: MENU_LAYER_Z_INDEX,
          ...menuStyle,
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {menuNode}
      </div>,
      target,
    )
    : null;
  return (
    <>
      <div
        id={id}
        ref={rootRef}
        className={joinClassNames(["pm-root", fullWidth && "pm-root-full-width", className])}
        style={style}
      >
        <div ref={triggerRef} className="pm-trigger">
          {children({
            open,
            show,
            hide: () => hide("manual"),
            toggle,
            triggerProps,
          })}
        </div>
      </div>
      {renderedMenu}
    </>
  );
};
const usePopoverMenuPosition = (
  triggerRef: RefObject<HTMLElement>,
  menuRef: RefObject<HTMLElement>,
  options: UsePopoverMenuPositionOptions = {},
) => {
  const {
    anchor = "top-left",
    attach,
    offset,
    snapToWindowMargin = DEFAULT_SNAP_TO_WINDOW_MARGIN,
  } = options;
  return useCallback(() => {
    if (!triggerRef.current || !menuRef.current) return null;
    const resolvedAttach = getResolvedAttach(anchor, attach);
    const resolvedOffset = getResolvedOffset(anchor, offset);
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const attachPoint = pointForAnchor(triggerRect, resolvedAttach);
    const origin = menuOriginForAnchor(menuRect, anchor);
    return snapToWindow(
      attachPoint.x + resolvedOffset.x - origin.x,
      attachPoint.y + resolvedOffset.y - origin.y,
      menuRect,
      snapToWindowMargin,
    );
  }, [anchor, attach, menuRef, offset, snapToWindowMargin, triggerRef]);
};

export { PopoverMenu, PopoverMenuHandle, usePopoverMenuHandle, usePopoverMenuPosition };
export type { Anchor, MenuBuilder, Point, PopoverMenuDismissReason, PopoverMenuProps, PopoverTriggerRenderProps };
