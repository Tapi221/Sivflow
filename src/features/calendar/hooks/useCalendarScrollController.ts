import { useCallback, useLayoutEffect, useRef } from "react";
import type { UIEvent } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarViewMode } from "../calendarPane.types";

type CalendarBuffer = {
  before: number;
  after: number;
};

type Props = {
  activeMode: "timeline" | "calendar" | string;
  selectedViewMode: CalendarViewMode;

  visibleDays: Date[];

  timelineColumns: unknown[];
  timelineColumnWidth: number;
  timelineAnchorColumnIndex: number;

  calendarBuffer: CalendarBuffer;

  viewportWidth: number;

  /** 日カラムの幅（px）。初期スクロール位置の計算に使用 */
  calendarDayColumnWidth: number;

  /** 左端スクロール時に呼ばれるコールバック（バッファを前方に拡張） */
  onExtendLeft: () => void;

  /** 右端スクロール時に呼ばれるコールバック（バッファを後方に拡張） */
  onExtendRight: () => void;
};

export const useCalendarScrollController = ({
  activeMode,
  visibleDays,
  timelineColumns,
  timelineColumnWidth,
  timelineAnchorColumnIndex,
  calendarBuffer,
  viewportWidth,
  calendarDayColumnWidth,
  onExtendLeft,
  onExtendRight,
}: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);

  // 拡張中フラグ（連続トリガー防止）
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);

  // 左拡張前の scrollWidth を記録（拡張後のスクロール位置補正用）
  const prependScrollWidthRef = useRef<number | null>(null);

  // calendarBuffer.before の前回値を追跡（リセットか拡張かを判定）
  const prevBufferBeforeRef = useRef(calendarBuffer.before);

  // ヘッダーとスクロール位置を同期するユーティリティ
  const syncHeader = useCallback((scrollLeft: number) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  // ─────────────────────────────
  // スクロールハンドラ
  // ─────────────────────────────
  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scroller = event.currentTarget;
      syncHeader(scroller.scrollLeft);

      const distLeft = scroller.scrollLeft;
      const distRight =
        scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;

      // 左端：バッファを前方に拡張
      if (
        distLeft < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;
        // 拡張前の scrollWidth を保存（拡張後の補正に使う）
        prependScrollWidthRef.current = scroller.scrollWidth;
        onExtendLeft();
      }

      // 右端：バッファを後方に拡張
      if (
        distRight < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;
        onExtendRight();
      }
    },
    [onExtendLeft, onExtendRight, syncHeader],
  );

  // ─────────────────────────────────────────────────────────
  // 左拡張後のスクロール位置補正
  //
  // 月表示の prependScrollHeight 補正と同じ考え方：
  //   左に列が追加されると scrollWidth が増える。
  //   scrollLeft を「増えた幅の分だけ右にずらす」ことで
  //   ユーザーが見ている位置が変わらないようにする。
  //
  // visibleDays.length が変化したとき（= 拡張完了時）に実行。
  // ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const prevWidth = prependScrollWidthRef.current;
    if (prevWidth === null) return;

    const scroller = scrollContainerRef.current;
    if (!scroller) {
      prependScrollWidthRef.current = null;
      isExtendingLeftRef.current = false;
      return;
    }

    const widthDiff = scroller.scrollWidth - prevWidth;
    if (widthDiff > 0) {
      scroller.scrollLeft += widthDiff;
      syncHeader(scroller.scrollLeft);
    }

    prependScrollWidthRef.current = null;
    isExtendingLeftRef.current = false;
  }, [visibleDays.length, syncHeader]);

  // 右拡張フラグのリセット
  useLayoutEffect(() => {
    isExtendingRightRef.current = false;
  }, [visibleDays.length]);

  // ─────────────────────────────────────────────────────────
  // バッファリセット検出
  //
  // resetTimelinePosition() が呼ばれると calendarBuffer.before が
  // 小さい値に戻る。この場合は拡張フラグ・補正 ref をすべてクリアし、
  // 次の useLayoutEffect で初期位置へスクロールさせる。
  // ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const prev = prevBufferBeforeRef.current;
    const current = calendarBuffer.before;

    if (current < prev) {
      // リセット検出 → フラグ・補正 ref をクリア
      isExtendingLeftRef.current = false;
      isExtendingRightRef.current = false;
      prependScrollWidthRef.current = null;
    }

    prevBufferBeforeRef.current = current;
  }, [calendarBuffer.before]);

  // ─────────────────────────────────────────────────────────
  // 初期・リセット時のスクロール位置設定
  //
  // ・マウント直後
  // ・Today ボタン / 前後ナビゲーションで calendarBuffer がリセットされたとき
  //   → calendarBuffer.before が変化するので useLayoutEffect が再実行される
  //
  // 拡張中（isExtendingLeftRef / prependScrollWidthRef がセット済み）のときは
  // 上の補正ブロックに委ねるため、ここでは何もしない。
  // ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    // 左拡張中は補正ロジックに任せる
    if (prependScrollWidthRef.current !== null) return;

    let nextScrollLeft = 0;

    if (activeMode === "timeline") {
      nextScrollLeft = timelineAnchorColumnIndex * timelineColumnWidth;
    } else {
      // バッファの before 分だけ右にずらし、さらにビューポート中央に合わせる
      const anchorOffset = calendarBuffer.before * calendarDayColumnWidth;
      const availableWidth = Math.max(0, viewportWidth - C.TIME_COLUMN_WIDTH);
      const centerOffset = Math.max(
        0,
        (availableWidth - calendarDayColumnWidth) / 2,
      );
      nextScrollLeft = Math.max(0, anchorOffset - centerOffset);
    }

    scroller.scrollLeft = nextScrollLeft;
    syncHeader(nextScrollLeft);
  }, [
    activeMode,
    calendarBuffer.before,
    calendarDayColumnWidth,
    timelineAnchorColumnIndex,
    timelineColumnWidth,
    viewportWidth,
    syncHeader,
  ]);

  return {
    scrollContainerRef,
    headerScrollRef,
    handleTimelineScroll,
  };
};
