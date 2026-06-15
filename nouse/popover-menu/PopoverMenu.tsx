import React, {
  CSSProperties,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "./PopoverMenu.css";

export type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "left-center"
  | "right-center";

export type Point = {
  x: number;
  y: number;
};

type PopoverMenuHandleState = {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  isDeployed: () => boolean;
  isFocused: () => boolean;
  refreshMenu: (menuBuilder: MenuBuilder) => void;
};

export type MenuBuilder = () => ReactNode | null;

export class PopoverMenuHandle {
  private state: PopoverMenuHandleState | null = null;

  /** Internal. PopoverMenu calls this when mounted. */
  _attach(state: PopoverMenuHandleState | null) {
    this.state = state;
  }

  show() {
    this.state?.show();
  }

  hide() {
    this.state?.hide();
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

export function usePopoverMenuHandle() {
  return useMemo(() => new PopoverMenuHandle(), []);
}

export type PopoverTriggerRenderProps = {
  open: boolean;
  toggle: () => void;
  show: () => void;
  hide: () => void;
  triggerProps: {
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
    onClick: (event: React.MouseEvent) => void;
    onMouseDown: (event: React.MouseEvent) => void;
  };
};

export type PopoverMenuProps = {
  id: string;
  menu: MenuBuilder;
  children: (props: PopoverTriggerRenderProps) => ReactNode;
  handle?: PopoverMenuHandle;
  anchor?: Anchor;
  attach?: Anchor;
  offset?: Point;
  fullWidth?: boolean;
  onOpen?: () => void;
  onDismiss?: () => void;
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

function oppositeAttachForAnchor(anchor: Anchor): Anchor {
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
}

function defaultOffset(anchor: Anchor): Point {
  // Rust uses 5px: 4px padding + 1px border.
  const offset = 5;

  switch (anchor) {
    case "top-right":
    case "bottom-right":
    case "right-center":
      return { x: offset, y: 0 };
    case "top-left":
    case "bottom-left":
    case "left-center":
      return { x: -offset, y: 0 };
    case "top-center":
    case "bottom-center":
      return { x: 0, y: 0 };
  }
}

function pointForAnchor(rect: DOMRect, anchor: Anchor): Point {
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
}

function menuOriginForAnchor(menuRect: DOMRect, anchor: Anchor): Point {
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
}

function snapToWindow(x: number, y: number, rect: DOMRect, margin: number): Point {
  const maxX = window.innerWidth - rect.width - margin;
  const maxY = window.innerHeight - rect.height - margin;

  return {
    x: Math.min(Math.max(x, margin), Math.max(margin, maxX)),
    y: Math.min(Math.max(y, margin), Math.max(margin, maxY)),
  };
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function PopoverMenu({
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
  snapToWindowMargin = 8,
}: PopoverMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const justClosedByTriggerMouseDownRef = useRef(false);

  const menuBuilderRef = useLatest(menu);
  const onOpenRef = useLatest(onOpen);
  const onDismissRef = useLatest(onDismiss);

  const [open, setOpen] = useState(false);
  const [menuNode, setMenuNode] = useState<ReactNode | null>(null);
  const [position, setPosition] = useState<Point | null>(null);

  const resolvedAttach = attach ?? oppositeAttachForAnchor(anchor);
  const resolvedOffset = offset ?? defaultOffset(anchor);

  const close = useCallback(() => {
    setOpen(false);
    setMenuNode(null);
    setPosition(null);
    onDismissRef.current?.();

    if (restoreFocusOnDismiss && previousFocusRef.current?.isConnected) {
      queueMicrotask(() => previousFocusRef.current?.focus());
    }
  }, [onDismissRef, restoreFocusOnDismiss]);

  const show = useCallback(() => {
    const nextMenu = menuBuilderRef.current();
    if (nextMenu == null) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setMenuNode(nextMenu);
    setOpen(true);
    onOpenRef.current?.();
  }, [menuBuilderRef, onOpenRef]);

  const hide = useCallback(() => {
    close();
  }, [close]);

  const toggle = useCallback(() => {
    if (open) hide();
    else show();
  }, [hide, open, show]);

  const refreshMenu = useCallback(
    (nextMenuBuilder: MenuBuilder) => {
      menuBuilderRef.current = nextMenuBuilder;
      if (!open) return;

      const nextMenu = nextMenuBuilder();
      if (nextMenu == null) {
        close();
      } else {
        setMenuNode(nextMenu);
      }
    },
    [close, menuBuilderRef, open],
  );

  useEffect(() => {
    handle?._attach({
      show,
      hide,
      toggle,
      isDeployed: () => open,
      isFocused: () => {
        const active = document.activeElement;
        return Boolean(
          active &&
            (menuRef.current?.contains(active) || triggerRef.current?.contains(active)),
        );
      },
      refreshMenu,
    });

    return () => {
      handle?._attach(null);
    };
  }, [handle, hide, open, refreshMenu, show, toggle]);

  const updatePosition = useCallback(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();

    const attachPoint = pointForAnchor(triggerRect, resolvedAttach);
    const menuOrigin = menuOriginForAnchor(menuRect, anchor);

    const rawX = attachPoint.x + resolvedOffset.x - menuOrigin.x;
    const rawY = attachPoint.y + resolvedOffset.y - menuOrigin.y;

    setPosition(snapToWindow(rawX, rawY, menuRect, snapToWindowMargin));
  }, [anchor, open, resolvedAttach, resolvedOffset.x, resolvedOffset.y, snapToWindowMargin]);

  useLayoutEffect(() => {
    updatePosition();
  }, [menuNode, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const frame1 = requestAnimationFrame(() => {
      const frame2 = requestAnimationFrame(() => {
        menuRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame2);
    });

    return () => cancelAnimationFrame(frame1);
  }, [open, menuNode]);

  useEffect(() => {
    if (!open) return;

    function handleResizeOrScroll() {
      updatePosition();
    }

    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);

    return () => {
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;

      const inMenu = menuRef.current?.contains(target);
      const inTrigger = triggerRef.current?.contains(target);

      if (inTrigger) {
        // Mirrors the Rust paint-phase special case:
        // clicking the trigger while the menu is open should dismiss it, not close then re-open.
        justClosedByTriggerMouseDownRef.current = true;
        close();
        event.stopPropagation();
        return;
      }

      if (!inMenu && closeOnOutsidePointerDown) {
        close();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (closeOnEscape && event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [close, closeOnEscape, closeOnOutsidePointerDown, open]);

  const triggerProps: PopoverTriggerRenderProps["triggerProps"] = {
    "aria-expanded": open,
    "aria-haspopup": "menu",
    onMouseDown: () => {
      // Reset on the next click cycle.
      queueMicrotask(() => {
        justClosedByTriggerMouseDownRef.current = false;
      });
    },
    onClick: (event) => {
      if (justClosedByTriggerMouseDownRef.current) {
        justClosedByTriggerMouseDownRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      toggle();
    },
  };

  const target = portal ?? (typeof document !== "undefined" ? document.body : null);

  const renderedMenu =
    open && target
      ? createPortal(
          <div
            id={`${id}-popover-menu`}
            ref={menuRef}
            className={["pm-menu-layer", menuClassName ?? ""].join(" ")}
            role="menu"
            tabIndex={-1}
            style={{
              visibility: position ? "visible" : "hidden",
              left: position?.x ?? 0,
              top: position?.y ?? 0,
              width: fullWidth && triggerRef.current ? triggerRef.current.getBoundingClientRect().width : undefined,
              ...menuStyle,
            }}
            onMouseDown={(event) => {
              // Occlude pointer events from reaching underlying UI.
              event.stopPropagation();
            }}
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
        className={["pm-root", fullWidth ? "pm-root-full-width" : "", className ?? ""].join(" ")}
        style={style}
      >
        <div ref={triggerRef} className="pm-trigger">
          {children({
            open,
            show,
            hide,
            toggle,
            triggerProps,
          })}
        </div>
      </div>
      {renderedMenu}
    </>
  );
}

export function usePopoverMenuPosition(
  triggerRef: RefObject<HTMLElement>,
  menuRef: RefObject<HTMLElement>,
  options: {
    anchor?: Anchor;
    attach?: Anchor;
    offset?: Point;
    snapToWindowMargin?: number;
  } = {},
) {
  const {
    anchor = "top-left",
    attach,
    offset,
    snapToWindowMargin = 8,
  } = options;

  return useCallback(() => {
    if (!triggerRef.current || !menuRef.current) return null;

    const resolvedAttach = attach ?? oppositeAttachForAnchor(anchor);
    const resolvedOffset = offset ?? defaultOffset(anchor);

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
}
