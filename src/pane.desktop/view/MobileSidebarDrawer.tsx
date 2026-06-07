import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; children: ReactNode };

const ROOT_CLASS = "fixed inset-0 z-[80] transition";
const OVERLAY_CLASS = "absolute inset-0 bg-black/35 transition-opacity";
const PANEL_CLASS = "absolute left-0 top-0 h-full w-[82vw] max-w-[320px] min-w-[260px] overflow-hidden rounded-r-[28px] bg-white transition-transform duration-200 ease-out";

const MobileSidebarDrawer = ({ id, isOpen, onClose, children }: MobileSidebarDrawerProps) => {
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

  return (
    <div className={cn(ROOT_CLASS, isOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!isOpen}>
      <button type="button" className={cn(OVERLAY_CLASS, isOpen ? "opacity-100" : "opacity-0")} onClick={onClose} aria-label="サイドバーを閉じる" />
      <div id={id} className={cn(PANEL_CLASS, isOpen ? "translate-x-0" : "-translate-x-full")}>
        {children}
      </div>
    </div>
  );
};

export { MobileSidebarDrawer };