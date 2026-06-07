import { type ReactNode, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type MobileTouchPoint = { clientX: number; clientY: number };

type MobileSidebarSwipeState = { startX: number; startY: number; latestX: number; latestY: number; isHorizontal: boolean };

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose