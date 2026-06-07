import { type ReactNode, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; children: ReactNode };

type MobileTouchPoint = { clientX: number; clientY: number };

type MobileSidebarSwipeState = { startX: number; startY: number; latestX: number; latestY: number };

const MOBILE_SIDEBAR_SWIPE_CLOSE_DISTANCE = 72;
const MOBILE_SIDEBAR_SWIPE_VERTICAL_TOLERANCE = 48;

const getTouchPoint = (event: ReactTouchEvent<HTMLElement>): MobileTouchPoint | null => {
  const touch = event.touches[0] ?? event.changedTouches[0];

  if (!touch) return null;

  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
  };
};

const MobileSidebarDrawer = ({ id, isOpen, onClose, children }: MobileSidebarDrawerProps) => {
  const swipeStateRef = useRef<MobileSidebarSwipeState | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleTouchStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const point = getTouchPoint(event);

    if (!point) return;

    swipeStateRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      latestX: point.clientX,
      latestY: point.clientY,
    };
  }, []);

  const handleTouchMove = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const point = getTouchPoint(event);
    const swipeState = swipeStateRef.current;

    if (!point || !swipeState) return;

    swipeState.latestX = point.clientX;
    swipeState.latestY = point.clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const swipeState = swipeStateRef.current;

    swipeStateRef.current = null;

    if (!swipeState) return;

    const deltaX = swipeState.latestX - swipeState.startX;
    const deltaY = Math.abs(swipeState.latestY - swipeState.startY);

    if (deltaX <= -MOBILE_SIDEBAR_SWIPE_CLOSE_DISTANCE && deltaY <= MOBILE_SIDEBAR_SWIPE_VERTICAL_TOLERANCE) onClose();
  }, [onClose]);

  return (
    <div className={cn("fixed inset-0 z-50 md:hidden", isOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!isOpen}>
      <button
        type="button"
        className={cn("absolute inset-0 bg-black/20 transition-opacity", isOpen ? "opacity-100" : "opacity-0")}
        aria-label="サイドバーを閉じる"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />
      <aside
        id={id}
        className={cn(
          "absolute left-0 top-0 h-full min-h-0 w-[280px] max-w-[82vw] transform bg-white shadow-[0_18px_48px_rgba(15,23,42,0.24)] transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="サイドバー"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </aside>
    </div>
  );
};

export { MobileSidebarDrawer };