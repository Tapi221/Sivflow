import { type ReactNode } from "react";

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; children: ReactNode };

const MobileSidebarDrawer = ({ id, isOpen, onClose, children }: MobileSidebarDrawerProps) => {
  const rootClassName = isOpen ? "pointer-events-auto fixed inset-0 z-[80]" : "pointer-events-none fixed inset-0 z-[80]";
  const overlayClassName = isOpen ? "absolute inset-0 bg-black/35 opacity-100 transition-opacity" : "absolute inset-0 bg-black/35 opacity-0 transition-opacity";
  const panelClassName = isOpen ? "absolute left-0 top-0 h-full w-[82vw] max-w-[320px] min-w-[260px] overflow-hidden rounded-r-[28px] bg-white transition-transform duration-200 ease-out translate-x-0" : "absolute left-0 top-0 h-full w-[82vw] max-w-[320px] min-w