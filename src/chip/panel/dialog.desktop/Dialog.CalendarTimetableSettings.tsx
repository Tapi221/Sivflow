import type { CalendarTimetablePeriod, CalendarTimetableVisibleDayCount } from "@core/domain/calendar/timetable/timetable.types";
import { DialogDesktopPanel } from "@/chip/panel/dialog.desktop/DialogDesktopPanel";
import { normalizeVisibleDayCount } from "@/features/calendar/timetable/calendarTimetable.storage";
import { cn } from "@/lib/utils";

type CalendarTimetableSettingsDialogProps = {
  periods: CalendarTimetablePeriod[];
  visibleDayCount: CalendarTimetableVisibleDayCount;
  onChangeVisibleDayCount: (visibleDayCount: CalendarTimetableVisibleDayCount) => Promise<void>;
  onAddPeriod: () => Promise<void>;
  onUpdatePeriod: (period: CalendarTimetablePeriod) => Promise<void>;
  onDeletePeriod: (periodId: string) => Promise<void>;
  onClose: () => void;
};

const VISIBLE_DAY_COUNT_OPTIONS = [5, 6, 7] as const;

const CalendarTimetableSettingsDialog = ({ periods, visibleDayCount, onChangeVisibleDayCount, onAddPeriod, onUpdatePeriod, onDeletePeriod, onClose }: CalendarTimetableSettingsDialogProps) => {
  return (
    <DialogDesktopPanel surfaceClassName="flex max-h-[calc(100dvh-100px)] w-full max-w-96 flex-col" ariaLabel="時間割設定" onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-zinc-900">時間割設定</h2>
          <p className="mt-1 text-xs font-medium text-zinc-500">曜日数と時限テンプレートを編集</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-5">
          <label className="mb-2 block text-xs font-bold text-zinc-500">表示曜日</label>
          <div className="flex gap-2">
            {VISIBLE_DAY_COUNT_OPTIONS.map((count) => {
              const visibleCount = normalizeVisibleDayCount(count);
              return (
                <button
                  key={count}
                  type="button"
                  className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", visibleDayCount === visibleCount ? "border-[#007aff] bg-blue-50 text-blue-500" : "border-zinc-200 bg-white text-zinc-500")}
                  onClick={() => {
                    void onChangeVisibleDayCount(visibleCount);
                  }}
                >
                  {count}日
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-500">時限</label>
            <button
              type="button"
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-bold text-blue-500"
              onClick={() => {
                void onAddPeriod();
              }}
            >
              時限を追加
            </button>
          </div>
          {periods.map((period) => (
            <div key={period.id} className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-slate-200 bg-[#fafafa] p-2">
              <input
                className="h-9 rounded-xl border border-zinc-200 bg-white px-2 text-center text-xs font-bold text-zinc-900"
                value={period.label}
                onChange={(event) => {
                  void onUpdatePeriod({ ...period, label: event.target.value });
                }}
                aria-label="時限名"
              />
              <input
                className="h-9 rounded-xl border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-900"
                type="time"
                value={period.startTime}
                onChange={(event) => {
                  void onUpdatePeriod({ ...period, startTime: event.target.value });
                }}
                aria-label={`${period.label}限の開始時刻`}
              />
              <input
                className="h-9 rounded-xl border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-900"
                type="time"
                value={period.endTime}
                onChange={(event) => {
                  void onUpdatePeriod({ ...period, endTime: event.target.value });
                }}
                aria-label={`${period.label}限の終了時刻`}
              />
              <button
                type="button"
                className="h-9 rounded-full px-2 text-xs font-bold text-[#ff3b30] disabled:text-[#c7c7cc]"
                disabled={periods.length <= 1}
                onClick={() => {
                  void onDeletePeriod(period.id);
                }}
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
    </DialogDesktopPanel>
  );
};

export { CalendarTimetableSettingsDialog };
export type { CalendarTimetableSettingsDialogProps };
