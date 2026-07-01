import type { CalendarEvent } from "@core/calendar";
import { CalendarTimeGrid } from "@web-renderer/features/calendar";

const SAMPLE_DATE = new Date("2026-06-01T00:00:00+09:00");
const RANGE_START = new Date("2026-06-01T08:00:00+09:00");
const RANGE_END = new Date("2026-06-01T18:00:00+09:00");
const SAMPLE_EVENTS: readonly CalendarEvent[] = [
  {
    id: "morning-review",
    calendarId: "sandbox",
    title: "朝の復習セッション",
    startsAt: new Date("2026-06-01T09:00:00+09:00"),
    endsAt: new Date("2026-06-01T10:15:00+09:00"),
    isAllDay: false,
    accentColor: "#38bdf8",
  },
  {
    id: "overlap-short",
    calendarId: "sandbox",
    title: "英単語 20 枚",
    startsAt: new Date("2026-06-01T09:20:00+09:00"),
    endsAt: new Date("2026-06-01T09:55:00+09:00"),
    isAllDay: false,
    accentColor: "#22c55e",
  },
  {
    id: "deck-maintenance",
    calendarId: "sandbox",
    title: "デッキ整理",
    startsAt: new Date("2026-06-01T10:00:00+09:00"),
    endsAt: new Date("2026-06-01T11:30:00+09:00"),
    isAllDay: false,
    accentColor: "#a78bfa",
  },
  {
    id: "reading-block",
    calendarId: "sandbox",
    title: "PDF 読解",
    startsAt: new Date("2026-06-01T13:00:00+09:00"),
    endsAt: new Date("2026-06-01T14:30:00+09:00"),
    isAllDay: false,
    accentColor: "#f97316",
  },
  {
    id: "dense-a",
    calendarId: "sandbox",
    title: "復習予定 A",
    startsAt: new Date("2026-06-01T13:15:00+09:00"),
    endsAt: new Date("2026-06-01T15:00:00+09:00"),
    isAllDay: false,
    accentColor: "#ec4899",
  },
  {
    id: "dense-b",
    calendarId: "sandbox",
    title: "復習予定 B",
    startsAt: new Date("2026-06-01T13:45:00+09:00"),
    endsAt: new Date("2026-06-01T14:15:00+09:00"),
    isAllDay: false,
    accentColor: "#eab308",
  },
  {
    id: "evening-wrap",
    calendarId: "sandbox",
    title: "今日の学習ログ確認",
    startsAt: new Date("2026-06-01T16:00:00+09:00"),
    endsAt: new Date("2026-06-01T17:00:00+09:00"),
    isAllDay: false,
    accentColor: "#14b8a6",
  },
] as const;

const getDateLabel = (date: Date): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "full",
  }).format(date);
};

const CalendarTimeGridSandboxPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">
            Calendar Time Grid Sandbox
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Event chip overlap layout
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            core の layoutCalendarTimeGridEvents を web-renderer の TimeGrid / EventChip に接続し、重なりイベントの横並び表示を確認する sandbox です。
          </p>
        </section>
        <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-white">確認対象</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                no-overlap mode で同時刻イベントを列分割する。
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                top / height / width / xOffset の CSS absolute positioning を確認する。
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                react-big-calendar は依存に入れず、表示ロジックだけを core 経由で使う。
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <>
                <p className="text-sm text-slate-400">Sample day</p>
                <h2 className="text-xl font-semibold text-white">{getDateLabel(SAMPLE_DATE)}</h2>
              </>
              <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                {SAMPLE_EVENTS.length} events / 08:00 - 18:00
              </div>
            </div>
            <CalendarTimeGrid events={SAMPLE_EVENTS} rangeStart={RANGE_START} rangeEnd={RANGE_END} layoutMode="no-overlap" />
          </div>
        </section>
      </div>
    </div>
  );
};

export { CalendarTimeGridSandboxPage };
