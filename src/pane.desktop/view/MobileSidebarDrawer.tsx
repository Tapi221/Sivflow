import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; closeLabel?: string; children: ReactNode };

const MobileSidebarDrawer = ({ id, isOpen, onClose, closeLabel = "サイドバーを閉じる", children }: MobileSidebarDrawerProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (