import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@web-renderer/chip/panel/dropdown-menu";
import { cn } from "@web-renderer/lib/utils";
import { cardHeightPxToLayoutRows, layoutRowsToCardHeightPx, snapMinCardHeightPx } from "@/domain/card/cardGeometry.constants";
import type { CssVars } from "@/types/style";



interface CardShellProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
  actionsTopLeft?: React.ReactNode;
  actionsTopRight?: React.ReactNode;
  children: React.ReactNode;
  drawMode?: boolean;
  resizable?: boolean;
  resizeStepPx?: number;
  resizeStorageKey?: string;
  heightPx?: number | null;
  onHeightChange?: (heightPx: number) => void;
  onMinHeightChange?: (heightPx: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  showResizeHandle?: boolean;
  lockHeight?: boolean;
}



const CardShell = React.forwardRef<HTMLDivElement, CardShellProps>(
  (
    {
      actions,
      actionsTopLeft,
      actionsTopRight,
      children,
      className,
      style,
      drawMode = false,
      resizable = false,
      resizeStepPx = 24,
      resizeStorageKey,
      heightPx,
      onHeightChange,
      onMinHeightChange: _onMinHeightChange,
      onResizeStart,
      onResizeEnd,
      showResizeHandle = true,
      lockHeight = false,
      ...props
    },
    ref,
  ) => {
    const shellRef = React.useRef<HTMLDivElement | null>(null);
    const [customHeightPx, setCustomHeightPx] = React.useState<number | null>(
      null,
    );
    const resizeRef = React.useRef<{
      pointerId: number;
      startY: number;
      baseHeight: number;
      baseRows: number;
    } | null>(null);
    const resizeRafRef = React.useRef<number | null>(null);
    const resizePendingHeightRef = React.useRef<number | null>(null);

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    const computeMinHeight = React.useCallback(() => {
      const element = shellRef.current;
      const contentBaseMin = resizeStepPx * 2;
      if (!element) return contentBaseMin;

      const widthRatio = resizable ? 1 / 8 : 3 / 4;
      const widthBasedMin =
        Math.ceil(
          ((element.clientWidth || element.offsetWidth || 0) * widthRatio) /
          resizeStepPx,
        ) * resizeStepPx;
      const baseMin = Math.max(contentBaseMin, widthBasedMin ?? 0);

      const body = element.querySelector(
        ".card-shell-body",
      ) as HTMLElement | null;
      if (!body) return baseMin;

      const blockRows = Array.from(
        body.querySelectorAll("[data-block-row=\"true\"]"),
      ) as HTMLElement[];
      if (blockRows.length > 0) {
        const surface = body.querySelector(
          "[data-card-surface=\"true\"]",
        ) as HTMLElement | null;
        const surfaceStyle = surface ? window.getComputedStyle(surface) : null;
        const ruledBottomOffsetPx = Math.max(
          0,
          Number.parseFloat(
            surfaceStyle?.getPropertyValue("--ruled-bottom-offset-px") ?? "0",
          ) ?? 0,
        );
        const bodyRect = body.getBoundingClientRect();
        const bodyScaleY =
          body.offsetHeight > 0 ? bodyRect.height / body.offsetHeight : 1;
        const safeBodyScaleY =
          Number.isFinite(bodyScaleY) && bodyScaleY > 0 ? bodyScaleY : 1;
        let maxBottom = 0;
        for (const row of blockRows) {
          const measureTarget =
            (row.querySelector(
              "[data-block-measure-root=\"true\"]",
            ) as HTMLElement | null) ?? row;
          const rowStyle = window.getComputedStyle(row);
          const marginBottom =
            Number.parseFloat(rowStyle.marginBottom ?? "0") ?? 0;
          const targetOffsetTop =
            measureTarget === row ? 0 : measureTarget.offsetTop;
          const layoutBottom =
            row.offsetTop +
            targetOffsetTop +
            Math.max(measureTarget.offsetHeight, measureTarget.scrollHeight) +
            marginBottom;
          const targetRect = measureTarget.getBoundingClientRect();
          const visualBottom =
            (targetRect.bottom - bodyRect.top) / safeBodyScaleY + marginBottom;
          const rowBottom = Math.max(layoutBottom, visualBottom);
          if (rowBottom > maxBottom) {
            maxBottom = rowBottom;
          }
        }

        const contentHeight = Math.max(0, maxBottom);
        const scrollContentHeight = Math.max(0, body.scrollHeight);
        const hasVerticalOverflow = scrollContentHeight > body.clientHeight + 1;
        const requiredHeight = hasVerticalOverflow
          ? Math.max(contentHeight + ruledBottomOffsetPx, scrollContentHeight)
          : contentHeight + ruledBottomOffsetPx;
        const snappedContentHeight = snapMinCardHeightPx(requiredHeight - 0.9);
        return Math.max(baseMin, snappedContentHeight || baseMin);
      }

      return baseMin;
    }, [resizable, resizeStepPx]);

    const computeMaxHeight = React.useCallback(() => {
      if (resizable) return Number.POSITIVE_INFINITY;
      if (typeof window === "undefined") return 900;
      return Math.max(Math.floor(window.innerHeight * 0.9), 420);
    }, [resizable]);

    const clampHeight = React.useCallback(
      (height: number) => {
        return clamp(height, computeMinHeight(), computeMaxHeight());
      },
      [computeMaxHeight, computeMinHeight],
    );

    const isControlledResize = typeof onHeightChange === "function";
    const resolvedHeightPx = heightPx ?? customHeightPx;
    const commitHeight = React.useCallback(
      (nextHeight: number) => {
        if (isControlledResize && onHeightChange) {
          onHeightChange(nextHeight);
          return;
        }
        setCustomHeightPx(nextHeight);
      },
      [isControlledResize, onHeightChange],
    );

    React.useEffect(() => {
      if (!resizable || !resizeStorageKey || typeof window === "undefined")
        return;

      const raw = window.localStorage.getItem(resizeStorageKey);
      if (!raw) return;

      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      setCustomHeightPx(clampHeight(parsed));
    }, [clampHeight, resizeStorageKey, resizable]);

    React.useEffect(() => {
      if (
        !resizable ||
        !resizeStorageKey ||
        (customHeightPx === null || customHeightPx === undefined) ||
        typeof window === "undefined"
      )
        return;
      window.localStorage.setItem(resizeStorageKey, String(customHeightPx));
    }, [customHeightPx, resizeStorageKey, resizable]);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        shellRef.current = node;
        if (!ref) return;
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      },
      [ref],
    );

    const topLeftItems = React.Children.toArray(actionsTopLeft).filter(Boolean);
    const topRightItems = React.Children.toArray(
      actionsTopRight ?? actions,
    ).filter(Boolean);
    const primaryTopRight = topRightItems.slice(0, 2);
    const overflowTopRight = topRightItems.slice(2);

    const enforcedShellOverflowStyle: React.CSSProperties = {
      overflow: "hidden",
    };

    const resolvedShellStyle: CssVars =
      (resolvedHeightPx !== null && resolvedHeightPx !== undefined)
        ? {
          ...(style ?? {}),
          ...enforcedShellOverflowStyle,
          "--card-resize-height": `${resolvedHeightPx}px`,
          minHeight: `${resolvedHeightPx}px`,
          ...(lockHeight
            ? {
              height: `${resolvedHeightPx}px`,
              maxHeight: `${resolvedHeightPx}px`,
            }
            : {}),
        }
        : {
          ...(style ?? {}),
          ...enforcedShellOverflowStyle,
        };

    return (
      <div
        ref={setRefs}
        className={cn(
          "card-shell",
          drawMode && "card-shell--paper",
          resizable && !drawMode && "card-shell--resizable",
          className,
        )}
        style={resolvedShellStyle}
        {...props}
      >
        {(topLeftItems.length > 0 || topRightItems.length > 0) && (
          <div className="card-shell-header">
            <div className="card-shell-header-side">
              {topLeftItems.map((action, index) => (
                <div key={`top-left-${index}`} className="card-shell-action">
                  {action}
                </div>
              ))}
            </div>
            <div className="card-shell-header-side card-shell-header-side-right">
              {primaryTopRight.map((action, index) => (
                <div key={`action-${index}`} className="card-shell-action">
                  {action}
                </div>
              ))}
              {overflowTopRight.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="card-shell-overflow"
                      onClick={(event) => event.stopPropagation()}
                      aria-label="More actions"
                    >
                      ...
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6}>
                    {overflowTopRight.map((action, index) => (
                      <DropdownMenuItem key={`overflow-${index}`} asChild>
                        {React.isValidElement(action) ? (
                          action
                        ) : (
                          <span>{action}</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}
        <div
          className="card-shell-body"
          style={{ overflowY: "hidden", overflowX: "visible" }}
        >
          {children}
        </div>

        {resizable && !drawMode && showResizeHandle && (
          <button
            type="button"
            aria-label="カードの高さを変更"
            className="card-shell-resize-handle"
            onPointerDown={(event) => {
              const element = shellRef.current;
              if (!element) return;

              event.preventDefault();
              event.stopPropagation();

              const pointerId = event.pointerId;
              onResizeStart?.();
              resizeRef.current = {
                pointerId,
                startY: event.clientY,
                baseHeight: resolvedHeightPx ?? element.offsetHeight,
                baseRows: cardHeightPxToLayoutRows(
                  resolvedHeightPx ?? element.offsetHeight,
                ),
              };

              const target = event.currentTarget;
              try {
                target.setPointerCapture(pointerId);
              } catch (error) {
                void error;
              }

              const onMove = (moveEvent: PointerEvent) => {
                if (
                  !resizeRef.current ||
                  moveEvent.pointerId !== resizeRef.current.pointerId
                )
                  return;
                moveEvent.preventDefault();

                const shellRect = element.getBoundingClientRect();
                const rawScaleY =
                  element.offsetHeight > 0
                    ? shellRect.height / element.offsetHeight
                    : 1;
                const safeScaleY =
                  Number.isFinite(rawScaleY) && rawScaleY > 0 ? rawScaleY : 1;
                const deltaY =
                  (moveEvent.clientY - resizeRef.current.startY) / safeScaleY;
                const snappedSteps =
                  deltaY >= 0
                    ? Math.max(
                      0,
                      Math.floor(
                        (deltaY + resizeStepPx * 0.75) / resizeStepPx,
                      ),
                    )
                    : Math.min(
                      0,
                      Math.ceil(
                        (deltaY - resizeStepPx * 0.25) / resizeStepPx,
                      ),
                    );
                const nextRowsRaw = resizeRef.current.baseRows + snappedSteps;
                const nextHeightRaw = layoutRowsToCardHeightPx(nextRowsRaw);
                const nextHeight = clampHeight(nextHeightRaw);

                resizePendingHeightRef.current = nextHeight;
                if ((resizeRafRef.current !== null && resizeRafRef.current !== undefined)) return;

                resizeRafRef.current = window.requestAnimationFrame(() => {
                  resizeRafRef.current = null;
                  const pendingHeight = resizePendingHeightRef.current;
                  resizePendingHeightRef.current = null;
                  if ((pendingHeight === null || pendingHeight === undefined)) return;
                  commitHeight(pendingHeight);
                });
              };

              const onEnd = (endEvent: PointerEvent) => {
                if (
                  !resizeRef.current ||
                  endEvent.pointerId !== resizeRef.current.pointerId
                )
                  return;
                resizeRef.current = null;
                if ((resizeRafRef.current !== null && resizeRafRef.current !== undefined)) {
                  window.cancelAnimationFrame(resizeRafRef.current);
                  resizeRafRef.current = null;
                }
                const pendingHeight = resizePendingHeightRef.current;
                resizePendingHeightRef.current = null;
                if ((pendingHeight !== null && pendingHeight !== undefined)) {
                  commitHeight(pendingHeight);
                }
                if (typeof window !== "undefined") {
                  window.requestAnimationFrame(() => {
                    onResizeEnd?.();
                  });
                } else {
                  onResizeEnd?.();
                }
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onEnd);
                window.removeEventListener("pointercancel", onEnd);
              };

              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onEnd);
              window.addEventListener("pointercancel", onEnd);
            }}
          >
            <span className="card-shell-resize-knob" />
          </button>
        )}
      </div>
    );
  },
);



CardShell.displayName = "CardShell";

export { CardShell };
