import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarMonthWeek } from "@/features/calendar/model/calendarMonth.model";

// ── 内部型

const MONTH_ROW_RESIZING_CLASS = "is-month-row-resizing";

type MonthScrollAnchor = {
  kind: "scroll";
  scrollTop: number;
  rowHeight: number;
};

type MonthBoundaryAnchor = {
  kind: "boundary";
  weekIndex: number;
  pointerOffsetTop: number;
};

type MonthRowResizeAnchor = MonthScrollAnchor | MonthBoundaryAnchor;

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
  /** 週行 DOM の Map（互換のため受け取るが、リサイズ中の DOM 計測には使わない） */
  weekRowRefsMap: RefObject<Map<string, HTMLElement>>;
  /** 現在描画中の週一覧（handle の行 index 計算に使用） */
  monthWeeks: CalendarMonthWeek[];
  /** リサイズ中フラグ（スクロール抑制のため外部と共有） */
  isResizingRef: RefObject<boolean>;
  /** resize lock 取得時のコールバック（遅延スクロール同期のキャンセルなどに使用） */
  onResizeStart?: () => void;
  /** commitHeight 完了後のコールバック（表示月再同期などに使用） */
  onAfterCommit?: () => void;
  /** ドラッグ中の RAF ごとに呼ばれるコールバック（ライブプレビュー用） */
  onLiveResize?: (height: number) => void;
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
  monthWeeks,
  isResizingRef,
  onResizeStart,
  onAfterCommit,
  onLiveResize,
}: UseMonthRowResizeOptions): UseMonthRowResizeReturn => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const monthRowHeightRef = useRef(C.DEFAULT_MONTH_ROW_HEIGHT);
  const pendingMonthRowHeightRef = useRef(C.DEFAULT_MONTH_ROW_HEIGHT);
  const resizeStateRef = useRef<MonthRowResizeState | null>(null);
  const rafRef = useRef<number | null>(null);
  const releaseResizeLockRafRef = useRef<number | null>(null);
  const activePointerCleanupRef = useRef<(() => void) | null>(null);
  const resizeSessionIdRef = useRef(0);

  const [monthRowHeight, setMonthRowHeight] = useState(
    C.readStoredMonthRowHeight,
  );

  const cancelPendingResizeLockRelease = useCallback(() => {
    if (releaseResizeLockRafRef.current === null) return;

    window.cancelAnimationFrame(releaseResizeLockRafRef.current);
    releaseResizeLockRafRef.current = null;
  }, []);

  const acquireResizeLock = useCallback(() => {
    cancelPendingResizeLockRelease();
    onResizeStart?.();

    const sessionId = resizeSessionIdRef.current + 1;
    resizeSessionIdRef.current = sessionId;
    isResizingRef.current = true;
    rootRef.current?.classList.add(MONTH_ROW_RESIZING_CLASS);

    return sessionId;
  }, [cancelPendingResizeLockRelease, isResizingRef, onResizeStart]);

  const releaseResizeLockAfterLayout = useCallback(
    (sessionId: number) => {
      cancelPendingResizeLockRelease();

      releaseResizeLockRafRef.current = window.requestAnimationFrame(() => {
        releaseResizeLockRafRef.current = null;

        if (resizeSessionIdRef.current !== sessionId) return;

        isResizingRef.current = false;
        rootRef.current?.classList.remove(MONTH_ROW_RESIZING_CLASS);
      });
    },
    [cancelPendingResizeLockRelease, isResizingRef],
  );

  // ── anchor 計算

  const getScrollAnchor = useCallback((): MonthScrollAnchor | null => {
    const scroller = scrollContainerRef.current;
    const rowHeight = monthRowHeightRef.current;

    if (
      !scroller ||
      !Number.isFinite(rowHeight) ||
      rowHeight <= 0
    ) {
      return null;
    }

    return {
      kind: "scroll",
      scrollTop: scroller.scrollTop,
      rowHeight,
    };
  }, [scrollContainerRef]);

  const getBoundaryAnchor = useCallback(
    (
      element: HTMLElement,
      clientY: number,
    ): MonthBoundaryAnchor | null => {
      const scroller = scrollContainerRef.current;
      const row = element.closest(
        "[data-calendar-week-key]",
      ) as HTMLElement | null;
      const weekKey = row?.dataset.calendarWeekKey;

      if (!scroller || !weekKey) return null;

      const weekIndex = monthWeeks.findIndex((week) => week.key === weekKey);
      if (weekIndex === -1) return null;

      const scrollerRect = scroller.getBoundingClientRect();

      return {
        kind: "boundary",
        weekIndex,
        pointerOffsetTop: clientY - scrollerRect.top,
      };
    },
    [monthWeeks, scrollContainerRef],
  );

  const preserveAnchor = useCallback(
    (anchor: MonthRowResizeAnchor | null, nextHeight: number) => {
      if (!anchor) return;

      const scroller = scrollContainerRef.current;
      if (!scroller) return;

      const firstWeekTop = C.CALENDAR_WEEKDAY_HEADER_HEIGHT;

      if (anchor.kind === "boundary") {
        const boundaryTop =
          firstWeekTop + (anchor.weekIndex + 1) * nextHeight;
        scroller.scrollTop = Math.max(
          0,
          Math.round(boundaryTop - anchor.pointerOffsetTop),
        );
        return;
      }

      if (anchor.rowHeight <= 0) return;

      if (anchor.scrollTop <= firstWeekTop) {
        scroller.scrollTop = anchor.scrollTop;
        return;
      }

      const rowOffset = anchor.scrollTop - firstWeekTop;
      const nextScrollTop =
        firstWeekTop + (rowOffset / anchor.rowHeight) * nextHeight;

      scroller.scrollTop = Math.max(0, Math.round(nextScrollTop));
    },
    [scrollContainerRef],
  );

  // ── CSS 変数の適用

  const applyVariable = useCallback(
    (height: number, anchor: MonthRowResizeAnchor | null = null) => {
      rootRef.current?.style.setProperty(
        "--calendar-month-row-height",
        `${height}px`,
      );
      preserveAnchor(anchor, height);
      onLiveResize?.(height);
    },
    [preserveAnchor, onLiveResize],
  );

  const scheduleVariable = useCallback((height: number) => {
    pendingMonthRowHeightRef.current = C.clampMonthRowHeight(height);
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      applyVariable(
        pendingMonthRowHeightRef.current,
        resizeStateRef.current?.anchor ?? null,
      );
    });
  }, [applyVariable]);

  const commitHeight = useCallback((
    height: number,
    anchor?: MonthRowResizeAnchor | null,
    resizeSessionId = acquireResizeLock(),
  ) => {
    const committed = C.normalizeStoredMonthRowHeight(
      C.clampMonthRowHeight(height),
    );
    const scrollAnchor = anchor === undefined
      ? getScrollAnchor()
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

    window.requestAnimationFrame(() => {
      onAfterCommit?.();
      releaseResizeLockAfterLayout(resizeSessionId);
    });
  }, [
    acquireResizeLock,
    applyVariable,
    getScrollAnchor,
    onAfterCommit,
    releaseResizeLockAfterLayout,
  ]);

  // ── 初期化・クリーンアップ

  useEffect(() => {
    monthRowHeightRef.current = monthRowHeight;
    pendingMonthRowHeightRef.current = monthRowHeight;
    applyVariable(monthRowHeight);
  }, [applyVariable, monthRowHeight]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      activePointerCleanupRef.current?.();
      cancelPendingResizeLockRelease();
      isResizingRef.current = false;
      rootRef.current?.classList.remove(MONTH_ROW_RESIZING_CLASS);
    };
  }, [cancelPendingResizeLockRelease, isResizingRef]);

  // ── イベントハンドラ

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      activePointerCleanupRef.current?.();

      const handleElement = event.currentTarget;
      try {
        handleElement.setPointerCapture(event.pointerId);
      } catch {
        // setPointerCapture は一部環境で失敗することがあるため無視する。
      }

      const resizeSessionId = acquireResizeLock();
      const startHeight = monthRowHeightRef.current;
      resizeStateRef.current = {
        startY: event.clientY,
        startHeight,
        anchor: getBoundaryAnchor(handleElement, event.clientY),
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
          resizeSessionId,
        );
        cleanup();
      };

      const cleanup = () => {
        resizeStateRef.current = null;
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        try {
          if (handleElement.hasPointerCapture(event.pointerId)) {
            handleElement.releasePointerCapture(event.pointerId);
          }
        } catch {
          // releasePointerCapture は一部環境で失敗することがあるため無視する。
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        if (activePointerCleanupRef.current === cleanup) {
          activePointerCleanupRef.current = null;
        }
      };

      activePointerCleanupRef.current = cleanup;

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [
      acquireResizeLock,
      commitHeight,
      getBoundaryAnchor,
      scheduleVariable,
    ],
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
