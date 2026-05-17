import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarMonthWeek } from "@/features/calendar/monthGrid";

// ── 内部型

type MonthRowResizeAnchor = {
  weekKey: string;
  offsetTop: number;
};

type MonthRowResizeState = {
  startY: number;
  startHeight: number;
  anchor: MonthRowResizeAnchor | null;
};

export type MonthViewStyle = CSSProperties & {
  "--calendar-month-row-height": string;
};

// ── 公開型

type UseMonthRowResizeOptions = {
  /** スクロールコンテナ（anchor 計算に使用） */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  /** 週行 DOM の Map（anchor 計算に使用） */
  weekRowRefsMap: RefObject<Map<string, HTMLElement>>;
  /** 現在描画中の週一覧（anchor 計算に使用） */
  monthWeeks: CalendarMonthWeek[];
  /** リサイズ中フラグ（スクロール抑制のため外部と共有） */
  isResizingRef: RefObject<boolean>;
  /** commitHeight 完了後のコールバック（表示月再同期などに使用） */
  onAfterCommit?: () => void;
};

export type UseMonthRowResizeReturn = {
  rootRef: RefObject<HTMLDivElement | null>;
  monthRowHeight: number;
  monthViewStyle: MonthViewStyle;
  handleResizePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  handleResizeKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleResizeReset: () => void;
};

// ── フック本体

export const useMonthRowResize = ({
  scrollContainerRef,
  weekRowRefsMap,
  monthWeeks,
  isResizingRef,
  onAfterCommit,
}: UseMonthRowResizeOptions): UseMonthRowResizeReturn => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const monthRowHeightRef = useRef(C.DEFAULT_MONTH_ROW_HEIGHT);
  const pendingMonthRowHeightRef = useRef(C.DEFAULT_MONTH_ROW_HEIGHT);
  const resizeStateRef = useRef<MonthRowResizeState | null>(null);
  const rafRef = useRef<number | null>(null);

  const [monthRowHeight, setMonthRowHeight] = useState(
    C.readStoredMonthRowHeight,
  );

  // ── anchor 計算

  const getAnchorFromScroller = useCallback(
    (scroller: HTMLElement): MonthRowResizeAnchor | null => {
      if (monthWeeks.length === 0) return null;
      const scrollerRect = scroller.getBoundingClientRect();
      const sampleY =
        scrollerRect.top + C.MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;
      let best: CalendarMonthWeek | null = null;
      let bestDist = Number.POSITIVE_INFINITY;

      for (const week of monthWeeks) {
        const row = weekRowRefsMap.current.get(week.key);
        if (!row) continue;
        const rect = row.getBoundingClientRect();
        if (rect.top <= sampleY && rect.bottom > sampleY) {
          best = week;
          break;
        }
        const dist = Math.min(
          Math.abs(rect.top - sampleY),
          Math.abs(rect.bottom - sampleY),
        );
        if (dist < bestDist) {
          bestDist = dist;
          best = week;
        }
      }

      if (!best) return null;
      const row = weekRowRefsMap.current.get(best.key);
      if (!row) return null;
      return {
        weekKey: best.key,
        offsetTop: row.getBoundingClientRect().top - scrollerRect.top,
      };
    },
    [monthWeeks, weekRowRefsMap],
  );

  const getAnchorFromElement = useCallback(
    (element: HTMLElement): MonthRowResizeAnchor | null => {
      const scroller = scrollContainerRef.current;
      const row = element.closest(
        "[data-calendar-week-key]",
      ) as HTMLElement | null;
      const weekKey = row?.dataset.calendarWeekKey;
      if (!scroller || !row || !weekKey) return null;
      return {
        weekKey,
        offsetTop:
          row.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top,
      };
    },
    [scrollContainerRef],
  );

  const preserveAnchor = useCallback(
    (anchor: MonthRowResizeAnchor | null) => {
      if (!anchor) return;
      const scroller = scrollContainerRef.current;
      const row = weekRowRefsMap.current.get(anchor.weekKey);
      if (!scroller || !row) return;
      const nextTop =
        row.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      scroller.scrollTop += nextTop - anchor.offsetTop;
    },
    [scrollContainerRef, weekRowRefsMap],
  );

  // ── CSS 変数の適用

  const applyVariable = useCallback(
    (height: number, anchor: MonthRowResizeAnchor | null = null) => {
      rootRef.current?.style.setProperty(
        "--calendar-month-row-height",
        `${height}px`,
      );
      preserveAnchor(anchor);
    },
    [preserveAnchor],
  );

  const scheduleVariable = useCallback(
    (height: number) => {
      pendingMonthRowHeightRef.current = C.clampMonthRowHeight(height);
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        applyVariable(
          pendingMonthRowHeightRef.current,
          resizeStateRef.current?.anchor ?? null,
        );
      });
    },
    [applyVariable],
  );

  const commitHeight = useCallback(
    (height: number, anchor?: MonthRowResizeAnchor | null) => {
      const committed = C.normalizeStoredMonthRowHeight(
        C.clampMonthRowHeight(height),
      );
      const scrollAnchor =
        anchor === undefined && scrollContainerRef.current
          ? getAnchorFromScroller(scrollContainerRef.current)
          : (anchor ?? null);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      monthRowHeightRef.current = committed;
      pendingMonthRowHeightRef.current = committed;
      applyVariable(committed, scrollAnchor);
      C.writeStoredMonthRowHeight(committed);
      setMonthRowHeight(committed);

      if (onAfterCommit) {
        window.requestAnimationFrame(onAfterCommit);
      }
    },
    [applyVariable, getAnchorFromScroller, onAfterCommit, scrollContainerRef],
  );

  // ── 初期化・クリーンアップ

  useEffect(() => {
    monthRowHeightRef.current = monthRowHeight;
    pendingMonthRowHeightRef.current = monthRowHeight;
    applyVariable(monthRowHeight);
  }, [applyVariable, monthRowHeight]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── イベントハンドラ

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const startHeight = monthRowHeightRef.current;
      isResizingRef.current = true;
      resizeStateRef.current = {
        startY: event.clientY,
        startHeight,
        anchor: getAnchorFromElement(event.currentTarget),
      };
      pendingMonthRowHeightRef.current = startHeight;

      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const onMove = (e: PointerEvent) => {
        const s = resizeStateRef.current;
        if (!s) return;
        scheduleVariable(s.startHeight + e.clientY - s.startY);
      };

      const onUp = () => {
        commitHeight(
          pendingMonthRowHeightRef.current,
          resizeStateRef.current?.anchor ?? null,
        );
        resizeStateRef.current = null;
        isResizingRef.current = false;
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [commitHeight, getAnchorFromElement, isResizingRef, scheduleVariable],
  );

  const handleResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const step = C.MONTH_ROW_HEIGHT_STEP;
      const keyMap: Record<string, number | undefined> = {
        ArrowUp: -step,
        ArrowDown: +step,
        PageUp: -step * 4,
        PageDown: +step * 4,
        Home: C.MIN_MONTH_ROW_HEIGHT - monthRowHeightRef.current,
        End: C.MAX_MONTH_ROW_HEIGHT - monthRowHeightRef.current,
      };
      const diff = keyMap[event.key];
      if (diff === undefined) return;
      event.preventDefault();
      commitHeight(monthRowHeightRef.current + diff);
    },
    [commitHeight],
  );

  const handleResizeReset = useCallback(() => {
    commitHeight(C.DEFAULT_MONTH_ROW_HEIGHT);
  }, [commitHeight]);

  const monthViewStyle: MonthViewStyle = {
    "--calendar-month-row-height": `${monthRowHeight}px`,
  };

  return {
    rootRef,
    monthRowHeight,
    monthViewStyle,
    handleResizePointerDown,
    handleResizeKeyDown,
    handleResizeReset,
  };
};
