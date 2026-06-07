import { type ReactNode, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import "@/pane.desktop/leftpane/sidebar.layered-directory.css";

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; children: ReactNode };

type MobileTouchPoint = { clientX: number; clientY: number };

type MobileSidebarSwipeState = { startX: number; startY: number; latestX: number; latest