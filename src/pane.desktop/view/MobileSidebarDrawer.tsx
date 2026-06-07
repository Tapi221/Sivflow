import { type ReactNode, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type MobileTouchPoint = { clientX: number; clientY: number };

type MobileSidebarSwipeState = { startX: number; startY: number; latestX: number; latestY: number; isHorizontal: boolean };

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; closeLabel?: string; children: ReactNode };

const MOBILE_SIDEBAR_SWIPE_DISTANCE = 56;
const MOBILE_SIDEBAR_SWIPE_HORIZONTAL_INTENT = 12;
const MOBILE_SIDEBAR_SWIPE