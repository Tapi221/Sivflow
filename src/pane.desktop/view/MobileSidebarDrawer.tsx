import { type ReactNode, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; children: ReactNode };

type MobileTouchPoint = { clientX: number; clientY: number };

type MobileSidebarSwipeState = { startX: number; startY: number; latestX: number; latestY: number; isHorizontal: boolean };

const ROOT_CLASS = "fixed inset-0 z-[80] transition";
const OVERLAY_CLASS = "absolute inset-0 bg-black/35 transition-opacity";
const PANEL_CLASS = "absolute left-0 top-0 h-full w-[82vw] max-w-[320px] min-w-[260px] overflow-hidden rounded-r-[28px] bg-white transition-transform duration-200 ease-out";
const MOBILE_SIDEBAR_SWIPE_DISTANCE = 56;
const MOBILE_SIDEBAR_SWIPE_HORIZONTAL_INTENT = 12;
const MOBILE_SIDEBAR_SWIPE_VERTICAL_LIMIT = 72;

const getPrimaryTouchPoint = (event: ReactTouchEvent<HTMLElement>): MobileTouchPoint | null => {
  const touch = event.touches[0] ?? event.changedTouches[0];
  if (!touch) return null;

  return { clientX: touch.clientX, clientY: touch.clientY };
};

const isMobileSidebarHorizontalSwipeIntent = (distanceX: number, distanceY: number): boolean => Math.abs(distanceX) >= MOBILE_SIDEBAR_SWIPE_HORIZONTAL_INTENT && Math.abs(distanceX) > Math.abs(distanceY) * 1.2;

const isMobileSidebarSwipeVerticallyStable = (distanceY: number): boolean => Math.abs(distanceY) <= MOBILE_SIDEBAR_SWIPE_VERTICAL_LIMIT;

const MobileSidebarDrawer = ({ id, isOpen, onClose, children }: MobileSidebarDrawerProps) => {
  const sidebarSwipeRef = useRef<MobileSidebarSwipeState | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSidebarSwipeStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (!isOpen) {
      sidebarSwipeRef.current = null;
      return;
    }

    const touch = getPrimaryTouchPoint(event);
    if (!touch) return;

    sidebarSwipeRef.current = { startX: touch.clientX, startY: touch.clientY, latestX: touch.clientX, latestY: touch.clientY, isHorizontal: false };
  }, [isOpen]);

  const handleSidebarSwipeMove = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const state = sidebarSwipeRef.current;
    const touch = getPrimaryTouchPoint(event);
    if (!state || !touch) return;

    const distanceX = touch.clientX - state.startX;
    const distanceY = touch.clientY - state.startY;
    state.latestX = touch.clientX;
    state.latestY = touch.clientY;

    if (!state.isHorizontal && isMobileSidebarHorizontalSwipeIntent(distanceX, distanceY)) state.isHorizontal = true;
    if (!state.isHorizontal) return;

    event.preventDefault();
  }, []);

  const handleSidebarSwipeEnd = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const state = sidebarSwipeRef.current;
    if (!state) return;

    const touch = getPrimaryTouchPoint(event);
    const latestX = touch?.clientX ?? state.latestX;
    const latestY = touch?.clientY ?? state.latestY;
    const distanceX = latestX - state.startX;
    const distanceY = latestY - state.startY;
    sidebarSwipeRef.current = null;

    if (!state.isHorizontal || !isMobileSidebarSwipeVerticallyStable(distanceY)) return;
    if (distanceX <= -MOBILE_SIDEBAR_SWIPE_DISTANCE) onClose();
  }, [onClose]);

  const handleSidebarSwipeCancel = useCallback(() => {
    sidebarSwipeRef.current = null;
  }, []);

  return (
    <div className={cn(ROOT_CLASS, isOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!isOpen}>
      <button type="button" className={cn(OVERLAY_CLASS, isOpen ? "opacity-100" : "opacity-0")} onClick={onClose} aria-label="サイドバーを閉じる" />
      <div id={id} className={cn(PANEL_CLASS, isOpen ? "translate-x-0" : "-translate-x-full")} onTouchStart={handleSidebarSwipeStart} onTouchMove={handleSidebarSwipeMove} onTouchEnd={handleSidebarSwipeEnd} onTouchCancel={handleSidebarSwipeCancel}>
        {children}
      </div>
    </div>
  );
};

export { MobileSidebarDrawer };