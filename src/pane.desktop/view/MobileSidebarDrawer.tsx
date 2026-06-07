import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; children: ReactNode };

const ROOT_CLASS = "fixed inset-0 z-[80] transition";
const OVERLAY_CLASS = "absolute inset-0 bg-black/35 transition-opacity";
const PANEL_CLASS = "absolute left-0 top-0 h-full w-[82vw] max-w-[320px] min-w-[260px] overflow-hidden rounded-r-[28px] bg-white transition