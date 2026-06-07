import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; children: ReactNode };

const MobileSidebarDrawer = ({ id, isOpen, onClose, children }: MobileSidebarDrawerProps) => {
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

  return (
    <div className={cn