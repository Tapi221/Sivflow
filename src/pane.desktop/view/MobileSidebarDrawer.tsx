import { type ReactNode, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type SwipeState = { startX: number; startY: number; latestX: number; latestY: number; horizontal: boolean };

type MobileSidebarDrawerProps = { id: string; isOpen: boolean; onClose: () => void; closeLabel?: string; children: ReactNode };

const SWIPE_DISTANCE = 56;
const SWIPE_HORIZONTAL_INTENT = 12;
const SWIPE_VERTICAL_LIMIT = 72;

const getTouchPoint = (event: ReactTouchEvent<HTMLElement>) => {
  const touch = event.touches[0] ?? event.changedTouches[0];
  if (!touch) return null;