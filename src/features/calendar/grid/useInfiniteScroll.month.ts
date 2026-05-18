import type { RefObject, UIEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as C from "@/features/calendar/calendar.constants.desktop";
import {
  buildCalendarMonthWeeks,
  getCalendarMonthKey,
  getCalendarWeekKey,
  type CalendarMonthWeek,
} from "@/features/calendar/model/calendarMonth.model";

// ── 公開型

type UseMonthInfiniteScrollOptions = {
  currentDate: Date;
  scrollTargetToken: number;
  /** リサイズ中はスクロールイベントを無視するためのフラグ */
  isResizingRef: RefObject<boolean>;
  onVisibleMonthChange?: (date: Date) => void;
};

export type UseMonthInfiniteScrollReturn = {
  monthWeeks: CalendarMonthWeek[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  weekRowRefsMap: RefObject<Map<string, HTMLElement>>;
  setWeekRowRef: (weekKey: string, node: HTMLElement | null) => void;
  handleScroll: (event: UIEvent<HTMLDivElement>) => void;
  /** リサイズ完了後など、外部から表示月を再同期する必要があるときに呼ぶ */
  syncVisibleMonth: () => void;
};

// ── フック本体

export const useMonthInfiniteScroll = ({
  currentDate,
  scrollTargetToken,
  isResizingRef,
  onVisibleMonthChange,
}: UseMonthInfiniteScrollOptions): UseMonthInfiniteScrollReturn => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const weekRowRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const prependScrollHeightRef = useRef<number | null>(null);
  const isExtendingBeforeRef = useRef(false);
  const isExtendingAfterRef = useRef(false);
  const pendingScrollWeekKeyRef = useRef<string | null>(
    getCalendarWeekKey(currentDate),
  );
  // ── 最後に処理したトークンを useLayoutEffect 内で追うための ref
  //    (useEffect → useLayoutEffect に昇格させたため、ref で管理する)
  const lastScrollTargetTokenRef = useRef(scrollTargetToken);
  const visibleMonthKeyRef = useRef(getCalendarMonthKey(currentDate));

  const [anchorMonth, setAnchorMonth] = useState(() => currentDate);
  const [monthOffsetRange, setMonthOffsetRange] = useState(
    C.createInitialMonthOffsetRange,
  );

  const monthWeeks = useMemo(
    () =>
      buildCalendarMonthWeeks({
        anchorDate: anchorMonth,
        startOffset: monthOffsetRange.startOffset,
        endOffset: monthOffsetRange.endOffset,
      }),
    [anchorMonth, monthOffsetRange.endOffset, monthOffsetRange.startOffset],
  );

  // ── 週行 ref の登録・解除

  const setWeekRowRef = useCallback(
    (weekKey: string, node: HTMLElement | null) => {
      if (node) {
        weekRowRefsMap.current.set(weekKey, node);
      } else {
        weekRowRefsMap.current.delete(weekKey);
      }
    },
    [],
  );

  // ── 表示月の同期

  const syncVisibleMonth = useCallback(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller || !onVisibleMonthChange || monthWeeks.length === 0) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const sampleY = scrollerRect.top + C.MONTH_SCROLL_VISIBLE_SAMPLE_OFFSET_PX;
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

    if (!best) return;
    const nextKey = getCalendarMonthKey(best.visibleMonthDate);
    if (nextKey === visibleMonthKeyRef.current) return;

    visibleMonthKeyRef.current = nextKey;
    onVisibleMonthChange(best.visibleMonthDate);
  }, [monthWeeks, onVisibleMonthChange]);

  // ── スクロールハンドラ

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (isResizingRef.current) return;
      const scroller = event.currentTarget;

      if (
        scroller.scrollTop < C.MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingBeforeRef.current
      ) {
        isExtendingBeforeRef.current = true;
        prependScrollHeightRef.current = scroller.scrollHeight;
        setMonthOffsetRange((c) => ({
          ...c,
          startOffset: c.startOffset - C.MONTH_EXTEND_COUNT,
        }));
      }

      const distToBottom =
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
      if (
        distToBottom < C.MONTH_SCROLL_EDGE_THRESHOLD_PX &&
        !isExtendingAfterRef.current
      ) {
        isExtendingAfterRef.current = true;
        setMonthOffsetRange((c) => ({
          ...c,
          endOffset: c.endOffset + C.MONTH_EXTEND_COUNT,
        }));
      }

      syncVisibleMonth();
    },
    [isResizingRef, syncVisibleMonth],
  );

  // ── scrollTargetToken 変化時：スクロール対象を再設定
  //
  //    【変更点】useEffect → useLayoutEffect に昇格
  //    理由: useEffect はペイント後に非同期実行されるため、同一レンダーサイクルで
  //    下の「初期スクロール useLayoutEffect」が先に走り、
  //    pendingScrollWeekKeyRef がまだセットされていない状態でスクロールが空振りする。
  //    useLayoutEffect に揃えることで「ref セット → スクロール試行」が
  //    同一コミットフェーズ内で順序通り実行される。
  //
  useLayoutEffect(() => {
    if (lastScrollTargetTokenRef.current === scrollTargetToken) return;
    lastScrollTargetTokenRef.current = scrollTargetToken;

    visibleMonthKeyRef.current = getCalendarMonthKey(currentDate);
    pendingScrollWeekKeyRef.current = getCalendarWeekKey(currentDate);
    prependScrollHeightRef.current = null;
    isExtendingBeforeRef.current = false;
    isExtendingAfterRef.current = false;

    setAnchorMonth(currentDate);
    setMonthOffsetRange(C.createInitialMonthOffsetRange());
  }, [currentDate, scrollTargetToken]);

  // ── 初期スクロール位置の同期
  //
  //    【変更点】RAF リトライを追加
  //    理由: anchorMonth / monthOffsetRange のリセット後、週行コンポーネントの
  //    マウントと ref 登録（setWeekRowRef）は React のコミット中に行われるが、
  //    レイアウトの再計算（offsetTop）が同一フレームで確定しない場合がある。
  //    1 回の試行で targetRow が見つからない場合は RAF で最大 10 フレームリトライし、
  //    DOM が確実に揃ってからスクロールを実行する。
  //
  useLayoutEffect(() => {
    const targetWeekKey = pendingScrollWeekKeyRef.current;
    if (!targetWeekKey) return;

    const attemptScroll = (): boolean => {
      const scroller = scrollContainerRef.current;
      const targetRow = weekRowRefsMap.current.get(targetWeekKey);
      if (!scroller || !targetRow) return false;

      scroller.scrollTop = Math.max(
        0,
        targetRow.offsetTop - C.WEEKDAY_HEADER_HEIGHT_PX,
      );
      pendingScrollWeekKeyRef.current = null;
      syncVisibleMonth();
      return true;
    };

    // 初回試行（ref が既に登録済みなら即座に完了）
    if (attemptScroll()) return;

    // ref がまだ登録されていない場合は RAF でリトライ（最大 10 フレーム）
    let rafId: number;
    let retryCount = 0;
    const retryScroll = () => {
      if (retryCount++ >= 10 || attemptScroll()) return;
      rafId = requestAnimationFrame(retryScroll);
    };
    rafId = requestAnimationFrame(retryScroll);

    return () => cancelAnimationFrame(rafId);
  }, [monthWeeks, syncVisibleMonth]);

  // ── prepend 後のスクロール位置補正

  useLayoutEffect(() => {
    const prevHeight = prependScrollHeightRef.current;
    if (prevHeight === null) return;
    const scroller = scrollContainerRef.current;
    if (!scroller) {
      prependScrollHeightRef.current = null;
      isExtendingBeforeRef.current = false;
      return;
    }

    scroller.scrollTop += scroller.scrollHeight - prevHeight;
    prependScrollHeightRef.current = null;
    isExtendingBeforeRef.current = false;
  }, [monthWeeks.length]);

  useEffect(() => {
    isExtendingAfterRef.current = false;
  }, [monthOffsetRange.endOffset]);

  return {
    monthWeeks,
    scrollContainerRef,
    weekRowRefsMap,
    setWeekRowRef,
    handleScroll,
    syncVisibleMonth,
  };
};