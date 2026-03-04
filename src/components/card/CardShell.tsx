import React from 'react';
import { cn } from '@/lib/utils';
import {
  cardHeightPxToLayoutRows,
  layoutRowsToCardHeightPx,
  snapMinCardHeightPx,
} from '@/components/card/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export const CardShell = React.forwardRef<HTMLDivElement, CardShellProps>(
  ({
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
    onMinHeightChange,
    onResizeStart,
    onResizeEnd,
    showResizeHandle = true,
    lockHeight = false,
    ...props
  }, ref) => {
    const shellRef = React.useRef<HTMLDivElement | null>(null);
    const [panZoom, setPanZoom] = React.useState({ x: 0, y: 0, scale: 1 });
    const pointersRef = React.useRef(new Map<number, { x: number; y: number }>());
    const panRef = React.useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    } | null>(null);
    const pinchRef = React.useRef<{
      distance: number;
      center: { x: number; y: number };
      startScale: number;
      startTranslate: { x: number; y: number };
    } | null>(null);

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const [customHeightPx, setCustomHeightPx] = React.useState<number | null>(null);
    const resizeRef = React.useRef<{
      pointerId: number;
      startY: number;
      baseHeight: number;
      baseRows: number;
    } | null>(null);
    const resizeRafRef = React.useRef<number | null>(null);
    const resizePendingHeightRef = React.useRef<number | null>(null);

    const computeMinHeight = React.useCallback(() => {
      const element = shellRef.current;
      const contentBaseMin = resizeStepPx * 2;
      if (!element) return contentBaseMin;

      const widthRatio = resizable ? (1 / 8) : (3 / 4);
      const widthBasedMin = Math.ceil(((element.clientWidth || element.offsetWidth || 0) * widthRatio) / resizeStepPx) * resizeStepPx;
      const baseMin = Math.max(contentBaseMin, widthBasedMin || 0);

      const body = element.querySelector('.card-shell-body') as HTMLElement | null;
      if (!body) return baseMin;

      const blockRows = Array.from(body.querySelectorAll('[data-block-row="true"]')) as HTMLElement[];
      if (blockRows.length > 0) {
        const surface = body.querySelector('[data-card-surface="true"]') as HTMLElement | null;
        const surfaceStyle = surface ? window.getComputedStyle(surface) : null;
        const ruledBottomOffsetPx = Math.max(
          0,
          Number.parseFloat(surfaceStyle?.getPropertyValue('--ruled-bottom-offset-px') || '0') || 0
        );
        // NOTE:
        // getBoundingClientRect() is affected by parent transforms (ScaleToFitFrame).
        // Using offset metrics keeps min-height calculation in layout space and
        // prevents underestimation when scaled down.
        const bodyRect = body.getBoundingClientRect();
        const bodyScaleY =
          body.offsetHeight > 0 ? bodyRect.height / body.offsetHeight : 1;
        const safeBodyScaleY =
          Number.isFinite(bodyScaleY) && bodyScaleY > 0 ? bodyScaleY : 1;
        let maxBottom = 0;
        for (const row of blockRows) {
          const measureTarget =
            (row.querySelector('[data-block-measure-root="true"]') as HTMLElement | null) ?? row;
          const style = window.getComputedStyle(row);
          const marginBottom = Number.parseFloat(style.marginBottom || '0') || 0;
          const targetOffsetTop = measureTarget === row ? 0 : measureTarget.offsetTop;
          const layoutBottom =
            row.offsetTop +
            targetOffsetTop +
            Math.max(measureTarget.offsetHeight, measureTarget.scrollHeight) +
            marginBottom;
          const targetRect = measureTarget.getBoundingClientRect();
          const visualBottom = ((targetRect.bottom - bodyRect.top) / safeBodyScaleY) + marginBottom;
          const rowBottom = Math.max(layoutBottom, visualBottom);
          if (rowBottom > maxBottom) {
            maxBottom = rowBottom;
          }
        }

        const contentHeight = Math.max(0, maxBottom);
        const requiredHeight = contentHeight + ruledBottomOffsetPx;
        // Subtract sub-pixel tolerance: getBoundingClientRect() can return fractional
        // CSS pixels (esp. on high-DPI screens), causing requiredHeight to land just
        // above a grid boundary and snapMinCardHeightPx (Math.ceil) to add an extra row.
        const snappedContentHeight = snapMinCardHeightPx(requiredHeight - 0.9);
        return Math.max(baseMin, snappedContentHeight || baseMin);
      }

      return baseMin;
    }, [resizable, resizeStepPx]);

    const computeMaxHeight = React.useCallback(() => {
      if (resizable) return Number.POSITIVE_INFINITY;
      if (typeof window === 'undefined') return 900;
      return Math.max(Math.floor(window.innerHeight * 0.9), 420);
    }, [resizable]);

    const clampHeight = React.useCallback((height: number) => {
      return clamp(height, computeMinHeight(), computeMaxHeight());
    }, [computeMaxHeight, computeMinHeight]);

    const isControlledResize = typeof onHeightChange === 'function';
    const resolvedHeightPx = heightPx ?? customHeightPx;
    const commitHeight = React.useCallback((nextHeight: number) => {
      if (isControlledResize && onHeightChange) {
        onHeightChange(nextHeight);
        return;
      }
      setCustomHeightPx(nextHeight);
    }, [isControlledResize, onHeightChange]);

    const isInteractiveTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      return Boolean(
        element.closest('button, a, input, textarea, select, [role="button"], [data-card-no-pan="true"]')
      );
    };

    React.useEffect(() => {
      const element = shellRef.current;
      if (!element || typeof ResizeObserver === 'undefined') return;

      const updateWidth = () => {
        const width = element.clientWidth || element.offsetWidth;
        if (!width) return;

        element.style.setProperty('--card-w', `${width}px`);

        setCustomHeightPx((prev) => {
          if (prev == null) return prev;
          if (resizeRef.current) return prev;
          return clampHeight(prev);
        });

        if (onMinHeightChange && !resizeRef.current) {
          onMinHeightChange(computeMinHeight());
        }
      };

      updateWidth();
      const observer = new ResizeObserver(updateWidth);
      observer.observe(element);

      return () => observer.disconnect();
    }, [clampHeight, computeMinHeight, onMinHeightChange]);

    React.useEffect(() => {
      if (!resizable || !resizeStorageKey || typeof window === 'undefined') return;

      const raw = window.localStorage.getItem(resizeStorageKey);
      if (!raw) return;

      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      setCustomHeightPx(clampHeight(parsed));
    }, [clampHeight, resizeStorageKey, resizable]);

    React.useEffect(() => {
      if (!resizable || !resizeStorageKey || customHeightPx == null || typeof window === 'undefined') return;
      window.localStorage.setItem(resizeStorageKey, String(customHeightPx));
    }, [customHeightPx, resizeStorageKey, resizable]);

    React.useEffect(() => {
      if (!onMinHeightChange || typeof ResizeObserver === 'undefined') return;

      const element = shellRef.current;
      if (!element) return;

      const body = element.querySelector('.card-shell-body') as HTMLElement | null;
      if (!body) return;

      let rafId: number | null = null;
      const scheduleNotify = () => {
        if (rafId != null || typeof window === 'undefined') return;
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          if (resizeRef.current) return;
          onMinHeightChange(computeMinHeight());
        });
      };

      const rowElements = new Set<HTMLElement>();
      const rowObserver = new ResizeObserver(() => scheduleNotify());

      const syncRowObservers = () => {
        const nextRows = new Set(
          Array.from(body.querySelectorAll('[data-block-row="true"]')) as HTMLElement[]
        );

        rowElements.forEach((row) => {
          if (!nextRows.has(row)) {
            rowObserver.unobserve(row);
            rowElements.delete(row);
          }
        });

        nextRows.forEach((row) => {
          if (!rowElements.has(row)) {
            rowObserver.observe(row);
            rowElements.add(row);
          }
        });
      };

      scheduleNotify();
      const bodyObserver = new ResizeObserver(() => scheduleNotify());
      bodyObserver.observe(body);
      syncRowObservers();

      const mutationObserver = new MutationObserver(() => {
        syncRowObservers();
        scheduleNotify();
      });

      mutationObserver.observe(body, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      body.addEventListener('input', scheduleNotify, true);

      return () => {
        body.removeEventListener('input', scheduleNotify, true);
        mutationObserver.disconnect();
        bodyObserver.disconnect();
        rowObserver.disconnect();
        if (rafId != null && typeof window !== 'undefined') {
          window.cancelAnimationFrame(rafId);
        }
      };
    }, [computeMinHeight, onMinHeightChange]);

    React.useEffect(() => {
      if (!drawMode) {
        setPanZoom({ x: 0, y: 0, scale: 1 });
      }
    }, [drawMode]);

    const setRefs = React.useCallback((node: HTMLDivElement | null) => {
      shellRef.current = node;
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }, [ref]);

    const topLeftItems = React.Children.toArray(actionsTopLeft).filter(Boolean);
    const topRightItems = React.Children.toArray(actionsTopRight ?? actions).filter(Boolean);
    const primaryTopRight = topRightItems.slice(0, 2);
    const overflowTopRight = topRightItems.slice(2);


    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawMode) return;
      if (isInteractiveTarget(event.target)) return;

      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: panZoom.x,
        originY: panZoom.y,
      };

      if (pointersRef.current.size === 2) {
        const points = Array.from(pointersRef.current.values());
        const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        const center = {
          x: (points[0].x + points[1].x) / 2,
          y: (points[0].y + points[1].y) / 2,
        };
        panRef.current = null;

        pinchRef.current = {
          distance,
          center,
          startScale: panZoom.scale,
          startTranslate: { x: panZoom.x, y: panZoom.y },
        };
      }
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawMode) return;
      if (!pointersRef.current.has(event.pointerId)) return;

      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointersRef.current.size >= 2 && pinchRef.current) {
        event.preventDefault();
        const points = Array.from(pointersRef.current.values());
        const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        const center = {
          x: (points[0].x + points[1].x) / 2,
          y: (points[0].y + points[1].y) / 2,
        };

        const nextScale = clamp(
          pinchRef.current.startScale * (distance / pinchRef.current.distance),
          0.5,
          3
        );
        const nextX =
          center.x -
          ((pinchRef.current.center.x - pinchRef.current.startTranslate.x) / pinchRef.current.startScale) * nextScale;
        const nextY =
          center.y -
          ((pinchRef.current.center.y - pinchRef.current.startTranslate.y) / pinchRef.current.startScale) * nextScale;

        setPanZoom({ x: nextX, y: nextY, scale: nextScale });
        return;
      }

      if (panRef.current?.pointerId === event.pointerId) {
        event.preventDefault();
        const deltaX = event.clientX - panRef.current.startX;
        const deltaY = event.clientY - panRef.current.startY;
        setPanZoom({
          x: panRef.current.originX + deltaX,
          y: panRef.current.originY + deltaY,
          scale: panZoom.scale,
        });
      }
    };

    const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawMode) return;
      pointersRef.current.delete(event.pointerId);
      if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
      if (pointersRef.current.size < 2) pinchRef.current = null;
    };

    const enforcedShellOverflowStyle: React.CSSProperties = {
      overflowY: 'visible',
      overflowX: 'visible',
    };

    const shell = (
      <div
        ref={setRefs}
        className={cn('card-shell', drawMode && 'card-shell--paper', resizable && !drawMode && 'card-shell--resizable', className)}
        style={
          resolvedHeightPx != null
            ? ({
                ...(style ?? {}),
                ...enforcedShellOverflowStyle,
                ['--card-resize-height' as any]: `${resolvedHeightPx}px`,
                minHeight: `${resolvedHeightPx}px`,
                ...(lockHeight
                  ? {
                      height: `${resolvedHeightPx}px`,
                      maxHeight: `${resolvedHeightPx}px`,
                    }
                  : {}),
              } as React.CSSProperties)
            : ({
                ...(style ?? {}),
                ...enforcedShellOverflowStyle,
              } as React.CSSProperties)
        }
        {...props}
        onClick={(e) => {
          // ★ card-shell-actions 内のボタン等からのバブリングは無視する
          // overflow:hidden によるクリッピングで stopPropagation が効かない場合の保険
          if ((e.target as HTMLElement).closest('.card-shell-header, .card-shell-footer, .card-shell-action, .card-shell-overflow')) return;
          props.onClick?.(e);
        }}
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
                        {React.isValidElement(action) ? action : <span>{action}</span>}
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
          style={{ overflowY: 'clip', overflowX: 'visible' }}
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
                baseRows: cardHeightPxToLayoutRows(resolvedHeightPx ?? element.offsetHeight),
              };

              const target = event.currentTarget;
              target.setPointerCapture(pointerId);

              const onMove = (moveEvent: PointerEvent) => {
                if (!resizeRef.current || moveEvent.pointerId !== resizeRef.current.pointerId) return;
                moveEvent.preventDefault();

                const deltaY = moveEvent.clientY - resizeRef.current.startY;
                const snappedSteps =
                  deltaY >= 0
                    ? Math.max(0, Math.floor((deltaY + resizeStepPx * 0.75) / resizeStepPx))
                    : Math.min(0, Math.ceil((deltaY - resizeStepPx * 0.25) / resizeStepPx));
                const nextRowsRaw = resizeRef.current.baseRows + snappedSteps;
                const nextHeightRaw = layoutRowsToCardHeightPx(nextRowsRaw);
                const nextHeight = clampHeight(nextHeightRaw);

                resizePendingHeightRef.current = nextHeight;
                if (resizeRafRef.current != null) return;

                resizeRafRef.current = window.requestAnimationFrame(() => {
                  resizeRafRef.current = null;
                  const pendingHeight = resizePendingHeightRef.current;
                  resizePendingHeightRef.current = null;
                  if (pendingHeight == null) return;
                  commitHeight(pendingHeight);
                });
              };

              const onEnd = (endEvent: PointerEvent) => {
                if (!resizeRef.current || endEvent.pointerId !== resizeRef.current.pointerId) return;
                resizeRef.current = null;
                if (resizeRafRef.current != null) {
                  window.cancelAnimationFrame(resizeRafRef.current);
                  resizeRafRef.current = null;
                }
                const pendingHeight = resizePendingHeightRef.current;
                resizePendingHeightRef.current = null;
                if (pendingHeight != null) {
                  commitHeight(pendingHeight);
                }
                if (typeof window !== 'undefined') {
                  window.requestAnimationFrame(() => {
                    onResizeEnd?.();
                  });
                } else {
                  onResizeEnd?.();
                }
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onEnd);
                window.removeEventListener('pointercancel', onEnd);
              };

              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onEnd);
              window.addEventListener('pointercancel', onEnd);
            }}
          >
            <span className="card-shell-resize-knob" />
          </button>
        )}
      </div>
    );

    if (!drawMode) {
      return shell;
    }

    return (
      <div
        className="card-shell-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className="card-shell-panzoom"
          style={{ transform: `translate(${panZoom.x}px, ${panZoom.y}px) scale(${panZoom.scale})` }}
        >
          {shell}
        </div>
      </div>
    );
  }
);

CardShell.displayName = 'CardShell';
