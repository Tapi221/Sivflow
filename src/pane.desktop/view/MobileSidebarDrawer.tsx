import { useCallback, useEffect, useRef } from "react";
import { cn } from "@web-renderer/lib/utils";
import type { ReactNode, TouchEvent as ReactTouchEvent } from "react";



type MobileSidebarDrawerProps = {
  id: string; isOpen: boolean; onClose: () => void; children: ReactNode; };
type MobileTouchPoint = {
  clientX: number; clientY: number; };
type MobileSidebarSwipeState = {
  startX: number; startY: number; latestX: number; latestY: number; isHorizontal: boolean; };



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
  const swipeStateRef = useRef<MobileSidebarSwipeState | null>(null);

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

  const handleTouchStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    if (!isOpen) {
      swipeStateRef.current = null;
      return;
    }

    const touch = getPrimaryTouchPoint(event);
    if (!touch) return;

    swipeStateRef.current = { startX: touch.clientX, startY: touch.clientY, latestX: touch.clientX, latestY: touch.clientY, isHorizontal: false };
  }, [isOpen]);

  const handleTouchMove = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const state = swipeStateRef.current;
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

  const handleTouchEnd = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const state = swipeStateRef.current;
    if (!state) return;

    const touch = getPrimaryTouchPoint(event);
    const latestX = touch?.clientX ?? state.latestX;
    const latestY = touch?.clientY ?? state.latestY;
    const distanceX = latestX - state.startX;
    const distanceY = latestY - state.startY;
    swipeStateRef.current = null;

    if (!state.isHorizontal || !isMobileSidebarSwipeVerticallyStable(distanceY)) return;
    if (distanceX <= -MOBILE_SIDEBAR_SWIPE_DISTANCE) onClose();
  }, [onClose]);

  const handleTouchCancel = useCallback(() => {
    swipeStateRef.current = null;
  }, []);

  return (
    <div className={cn("fixed inset-0 z-[80] transition md:hidden", isOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!isOpen}>
      <button type="button" className={cn("absolute inset-0 bg-black/35 transition-opacity", isOpen ? "opacity-100" : "opacity-0")} onClick={onClose} aria-label="サイドバーを閉じる" tabIndex={isOpen ? 0 : -1} />
      <aside id={id} className={cn("absolute left-0 top-0 h-full w-[82vw] max-w-80 min-w-64 overflow-hidden rounded-r-[28px] bg-white transition-transform duration-200 ease-out", isOpen ? "translate-x-0" : "-translate-x-full")} role="dialog" aria-modal="true" aria-label="サイドバー" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
        {children}
      </aside>
    </div>
  );
};



export { MobileSidebarDrawer };
