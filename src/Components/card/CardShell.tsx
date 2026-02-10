import React from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

interface CardShellProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
  actionsTopLeft?: React.ReactNode;
  actionsTopRight?: React.ReactNode;
  actionsBottomLeft?: React.ReactNode;
  actionsBottomRight?: React.ReactNode;
  children: React.ReactNode;
  drawMode?: boolean;
}

export const CardShell = React.forwardRef<HTMLDivElement, CardShellProps>(
  ({
    actions,
    actionsTopLeft,
    actionsTopRight,
    actionsBottomLeft,
    actionsBottomRight,
    children,
    className,
    style,
    drawMode = false,
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
    const scrollRef = React.useRef<{
      pointerId: number;
      startY: number;
      startScrollTop: number;
      element: HTMLElement;
    } | null>(null);

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
      };

      updateWidth();
      const observer = new ResizeObserver(updateWidth);
      observer.observe(element);

      return () => observer.disconnect();
    }, []);

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
    const bottomLeftItems = React.Children.toArray(actionsBottomLeft).filter(Boolean);
    const bottomRightItems = React.Children.toArray(actionsBottomRight).filter(Boolean);

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawMode) return;
      if (isInteractiveTarget(event.target)) return;

      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const scrollElement = (event.target as HTMLElement | null)?.closest('.card-shell-body') as HTMLElement | null;
      if (scrollElement) {
        scrollRef.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startScrollTop: scrollElement.scrollTop,
          element: scrollElement,
        };
      } else {
        panRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: panZoom.x,
          originY: panZoom.y,
        };
      }

      if (pointersRef.current.size === 2) {
        const points = Array.from(pointersRef.current.values());
        const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        const center = {
          x: (points[0].x + points[1].x) / 2,
          y: (points[0].y + points[1].y) / 2,
        };
        panRef.current = null;
        scrollRef.current = null;
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

      if (scrollRef.current?.pointerId === event.pointerId) {
        event.preventDefault();
        const deltaY = event.clientY - scrollRef.current.startY;
        scrollRef.current.element.scrollTop = scrollRef.current.startScrollTop - deltaY;
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
      if (scrollRef.current?.pointerId === event.pointerId) scrollRef.current = null;
      if (pointersRef.current.size < 2) pinchRef.current = null;
    };

    const shell = (
      <div
        ref={setRefs}
        className={cn('card-shell', drawMode && 'card-shell--paper', className)}
        style={style}
        {...props}
      >
        {topLeftItems.length > 0 && (
          <div className="card-shell-actions card-shell-actions-top-left">
            {topLeftItems.map((action, index) => (
              <div key={`top-left-${index}`} className="card-shell-action">
                {action}
              </div>
            ))}
          </div>
        )}
        {topRightItems.length > 0 && (
          <div className="card-shell-actions card-shell-actions-top-right">
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
        )}
        {bottomLeftItems.length > 0 && (
          <div className="card-shell-actions card-shell-actions-bottom-left">
            {bottomLeftItems.map((action, index) => (
              <div key={`bottom-action-${index}`} className="card-shell-action">
                {action}
              </div>
            ))}
          </div>
        )}
        {bottomRightItems.length > 0 && (
          <div className="card-shell-actions card-shell-actions-bottom-right">
            {bottomRightItems.map((action, index) => (
              <div key={`bottom-right-${index}`} className="card-shell-action">
                {action}
              </div>
            ))}
          </div>
        )}
        <div
          className={cn(
            'card-shell-body',
            (bottomLeftItems.length > 0 || bottomRightItems.length > 0) && 'card-shell-body--bottom'
          )}
        >
          {children}
        </div>
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
