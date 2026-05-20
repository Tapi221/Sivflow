/**
 * DayDetailPanel.tsx
 *
 * 月表示でセルを選択したときに右側に表示される「その日の予定」パネル。
 *
 * 仕様（画像より）:
 *  - ヘッダー: 日付テキスト + × 閉じるボタン
 *  - 終日セクション
 *  - 時間グリッド: 0:00〜23:00 の時刻ラベルが各行左に明確に表示
 *  - フッター: "＋ 新しい予定を作成" ボタン（固定）
 */

import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useLayoutEffect, useRef } from "react";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { generateColorTokens } from "@/features/calendar/ui/calendar.color-tokens";

// ─────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────

/** 1時間行の高さ (px) — 画像に合わせてコンパクトに */
const HOUR_ROW_HEIGHT = 32;

/** 0〜23 時 */
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** 初期スクロール: 8時付近 */
const DEFAULT_SCROLL_HOUR = 8;

// ─────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────

const getStartMinutes = (event: GoogleCalendarEvent): number => {
  const d = new Date(event.startsAt);
  return d.getHours() * 60 + d.getMinutes();
};

const getDurationMinutes = (event: GoogleCalendarEvent): number => {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const diff = end - start;
  return diff > 0 ? Math.max(30, diff / 60_000) : 30;
};

// ─────────────────────────────────────────────
// 重なりレイアウト計算
// ─────────────────────────────────────────────

type LayoutSlot = { left: number; width: number };

const computeLayout = (
  events: GoogleCalendarEvent[],
): Map<string, LayoutSlot> => {
  const result = new Map<string, LayoutSlot>();
  if (events.length === 0) return result;

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  type Cluster = { events: GoogleCalendarEvent[]; maxEnd: number };
  const clusters: Cluster[] = [];

  for (const ev of sorted) {
    const startMin = getStartMinutes(ev);
    const endMin = startMin + getDurationMinutes(ev);
    const last = clusters[clusters.length - 1];
    if (last && startMin < last.maxEnd) {
      last.events.push(ev);
      last.maxEnd = Math.max(last.maxEnd, endMin);
    } else {
      clusters.push({ events: [ev], maxEnd: endMin });
    }
  }

  for (const { events: cls } of clusters) {
    const colEnd: number[] = [];
    const colOf = new Map<string, number>();

    for (const ev of cls) {
      const startMin = getStartMinutes(ev);
      const endMin = startMin + getDurationMinutes(ev);
      let col = colEnd.findIndex((e) => e <= startMin);
      if (col === -1) {
        col = colEnd.length;
        colEnd.push(endMin);
      } else {
        colEnd[col] = endMin;
      }
      colOf.set(ev.id, col);
    }

    const total = colEnd.length;
    for (const ev of cls) {
      const col = colOf.get(ev.id) ?? 0;
      result.set(ev.id, { left: col / total, width: 1 / total });
    }
  }

  return result;
};

// ─────────────────────────────────────────────
// 終日イベントチップ
// ─────────────────────────────────────────────

const AllDayChip = ({ event }: { event: GoogleCalendarEvent }) => {
  const tokens = generateColorTokens(event.accentColor);
  return (
    <div
      className="truncate rounded px-1.5 py-[3px] text-[11px] font-medium leading-[1.4]"
      style={{
        background: tokens.bg,
        borderLeft: `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={event.title}
    >
      {event.title}
    </div>
  );
};

// ─────────────────────────────────────────────
// 時間指定イベントチップ（絶対位置配置）
// ─────────────────────────────────────────────

const TimedEventChip = ({
  event,
  left,
  width,
}: {
  event: GoogleCalendarEvent;
  left: number;
  width: number;
}) => {
  const tokens = generateColorTokens(event.accentColor);
  const startMin = getStartMinutes(event);
  const durMin = getDurationMinutes(event);

  const top = (startMin / 60) * HOUR_ROW_HEIGHT;
  const height = Math.max(20, (durMin / 60) * HOUR_ROW_HEIGHT - 1);
  const timeLabel = format(new Date(event.startsAt), "H:mm");

  return (
    <div
      className="absolute overflow-hidden rounded px-1.5 py-[3px] text-left"
      style={{
        top,
        height,
        left: `${left * 100}%`,
        width: `${width * 100}%`,
        background: tokens.bg,
        borderLeft: `3px solid ${tokens.border}`,
        color: tokens.text,
      }}
      title={`${timeLabel} ${event.title}`}
    >
      <span className="truncate text-[11px] font-medium tabular-nums leading-none">
        <span className="opacity-75">{timeLabel}</span>
        {" "}
        {event.title}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────
// 現在時刻インジケーター
// ─────────────────────────────────────────────

const CurrentTimeBar = ({ currentMinutes }: { currentMinutes: number }) => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
    style={{ top: (currentMinutes / 60) * HOUR_ROW_HEIGHT }}
  >
    <div
      className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#185FA5]"
      style={{ marginLeft: -3.5 }}
    />
    <div className="h-[1.5px] flex-1 bg-[#185FA5] opacity-80" />
  </div>
);

// ─────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────

export type DayDetailPanelProps = {
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  currentMinutes?: number;
  onClose?: () => void;
};

export const DayDetailPanel = ({
  selectedDate,
  events,
  currentMinutes,
  onClose,
}: DayDetailPanelProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevDateKeyRef = useRef<string>("");
  const dateKey = format(selectedDate, "yyyy-MM-dd");

  // 日付変更時に 8 時付近へスクロール
  useLayoutEffect(() => {
    if (prevDateKeyRef.current === dateKey) return;
    prevDateKeyRef.current = dateKey;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = DEFAULT_SCROLL_HOUR * HOUR_ROW_HEIGHT - 8;
  }, [dateKey]);

  const today = new Date();
  const isToday = isSameDay(selectedDate, today);

  const allDayEvents = events.filter(
    (e) => e.isAllDay && isSameDay(new Date(e.startsAt), selectedDate),
  );
  const timedEvents = events.filter(
    (e) => !e.isAllDay && isSameDay(new Date(e.startsAt), selectedDate),
  );
  const layout = computeLayout(timedEvents);

  return (
    <aside
      className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-[#e5e7eb] bg-white"
      aria-label={`${format(selectedDate, "M月d日", { locale: ja })}の予定`}
    >
      {/* ── ヘッダー ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] px-4 py-[10px]">
        <span className="text-[13px] font-semibold text-[#24272f]">
          {format(selectedDate, "yyyy年M月d日(E)", { locale: ja })}
        </span>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-[#8f929c] transition-colors hover:bg-[#f4f5f7] hover:text-[#24272f] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* × アイコン */}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* ── スクロール本体 ── */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">

        {/* 終日セクション */}
        <div className="flex min-h-[28px] border-b border-[#eef0f3]">
          {/* 終日ラベル */}
          <div className="flex w-[52px] shrink-0 items-start justify-end border-r border-[#e5e7eb] pr-2 pt-[6px]">
            <span className="text-[10px] font-medium leading-none text-[#b0b4be]">
              終日
            </span>
          </div>
          {/* 終日イベント */}
          <div className="flex flex-1 flex-col gap-[3px] px-1.5 py-1.5">
            {allDayEvents.map((ev) => (
              <AllDayChip key={ev.id} event={ev} />
            ))}
          </div>
        </div>

        {/* 時間グリッド */}
        <div className="flex">

          {/* ── 時刻ラベル列 ──
              ★ 全時刻（0:00 〜 23:00）を各行の上端に表示 */}
          <div
            className="w-[52px] shrink-0 border-r border-[#e5e7eb]"
            style={{ height: HOURS.length * HOUR_ROW_HEIGHT }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end border-b border-[#eef0f3] pr-2 pt-[3px]"
                style={{ height: HOUR_ROW_HEIGHT }}
              >
                {/* 0:00 も含めた全時刻を上端に表示 */}
                <span className="text-[10px] font-medium tabular-nums leading-none text-[#b0b4be]">
                  {hour}:00
                </span>
              </div>
            ))}
          </div>

          {/* ── イベント配置エリア ── */}
          <div
            className="relative flex-1"
            style={{ height: HOURS.length * HOUR_ROW_HEIGHT }}
          >
            {/* グリッド線 */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="border-b border-[#eef0f3]"
                style={{ height: HOUR_ROW_HEIGHT }}
              />
            ))}

            {/* 現在時刻インジケーター */}
            {isToday && currentMinutes !== undefined && (
              <CurrentTimeBar currentMinutes={currentMinutes} />
            )}

            {/* イベントオーバーレイ */}
            <div className="absolute inset-x-[2px] inset-y-0">
              {timedEvents.map((ev) => {
                const slot = layout.get(ev.id) ?? { left: 0, width: 1 };
                return (
                  <TimedEventChip
                    key={ev.id}
                    event={ev}
                    left={slot.left}
                    width={slot.width}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── フッター（固定）── */}
      <div className="shrink-0 border-t border-[#e5e7eb] p-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#e2e4e9] bg-white py-2 text-[12px] font-medium text-[#474d5c] transition-colors hover:bg-[#f4f5f7] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>新しい予定を作成</span>
        </button>
      </div>
    </aside>
  );
};