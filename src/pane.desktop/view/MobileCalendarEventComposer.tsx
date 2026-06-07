import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import type { CalendarRecurrenceFrequency, CalendarRecurrenceRule, CalendarWeekday } from "@core/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type RecurrencePreset = "none" | "daily" | "weekly" | "monthly" | "yearly";

type MobileCalendarEventComposerProps = {
  isOpen: boolean;
  selectedDate: Date;
  googleAccounts: GoogleAccountDisplay[];
  onCreateEvent: (accountId: string, event: GCalWritableEventInput) => Promise<GoogleCalendarEvent>;
  onClose: () => void;
};

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "10:00";
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const createDateTime = (dateValue: string, timeValue: string): Date => new Date(`${dateValue}T${timeValue}:00`);

const createAllDayEndDate = (dateValue: string): Date => addDays(startOfDay(createDateTime(dateValue, "00:00")), 1);

const toRecurrenceRule = (preset: RecurrencePreset, selectedWeekday: CalendarWeekday): CalendarRecurrenceRule | null => {
  if (preset === "none") return null;

  const frequency = preset as CalendarRecurrenceFrequency;
  const rule: CalendarRecurrenceRule = { frequency };

  if (frequency === "weekly") rule.daysOfWeek = [selectedWeekday];

  return rule;
};

const getWritableCalendars = (accounts: GoogleAccountDisplay[]) =>
  accounts.flatMap((account) =>
    account.calendars
      .filter((calendar) => calendar.selected !== false)
      .map((calendar) => ({
        accountId: account.accountId,
        accountLabel: account.email ?? account.name ?? "Google Calendar",
        calendarId: calendar.id,
        calendarLabel: calendar.summaryOverride ?? calendar.summary,
        color: calendar.backgroundColor,
      })),
  );

const MobileCalendarEventComposer = ({ isOpen, selectedDate, googleAccounts, onCreateEvent, onClose }: MobileCalendarEventComposerProps) => {
  const writableCalendars = useMemo(() => getWritableCalendars(googleAccounts), [googleAccounts]);
  const defaultCalendarKey = writableCalendars[0] ? `${writableCalendars[0].accountId}::${writableCalendars[0].calendarId}` : "";
  const selectedDateValue = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);
  const selectedWeekday = selectedDate.getDay() as CalendarWeekday;

  const [calendarKey, setCalendarKey] = useState(defaultCalendarKey);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateValue, setDateValue] = useState(selectedDateValue);
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setCalendarKey(defaultCalendarKey);
    setTitle("");
    setDescription("");
    setLocation("");
    setDateValue(selectedDateValue);
    setStartTime(DEFAULT_START_TIME);
    setEndTime(DEFAULT_END_TIME);
    setIsAllDay(false);
    setRecurrencePreset("none");
    setIsSubmitting(false);
  }, [defaultCalendarKey, isOpen, selectedDateValue]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const [accountId, calendarId] = calendarKey.split("::");
    if (!accountId || !calendarId) {
      toast.error("予定を作成できませんでした", { description: "Google Calendar を選択してください。" });
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("予定名を入力してください");
      return;
    }

    const startsAt = isAllDay ? startOfDay(createDateTime(dateValue, "00:00")) : createDateTime(dateValue, startTime);
    const fallbackEnd = isAllDay ? createAllDayEndDate(dateValue) : addHours(startsAt, 1);
    const requestedEnd = isAllDay ? fallbackEnd : createDateTime(dateValue, endTime);
    const endsAt = requestedEnd > startsAt ? requestedEnd : fallbackEnd;
    const recurrenceRule = toRecurrenceRule(recurrencePreset, selectedWeekday);

    setIsSubmitting(true);
    try {
      await onCreateEvent(accountId, {
        calendarId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startsAt,
        endsAt,
        isAllDay,
        recurrenceRule,
      });
      toast.success("予定を作成しました");
      onClose();
    } catch (error) {
      console.error("[MobileCalendarEventComposer] create event failed", error);
      toast.error("予定を作成できませんでした", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }, [calendarKey, dateValue, description, endTime, isAllDay, location, onClose, onCreateEvent, recurrencePreset, selectedWeekday, startTime, title]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(94vw,520px)] max-w-[520px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white p-0 shadow-xl" closeLabel="閉じる">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-zinc-100 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-zinc-950">予定を追加</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">Google Calendar に新しい予定を作成します。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-5 py-5">
            <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
              カレンダー
              <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400" value={calendarKey} onChange={(event) => setCalendarKey(event.target.value)} disabled={isSubmitting}>
                {writableCalendars.length === 0 ? <option value="">連携済みのカレンダーがありません</option> : null}
                {writableCalendars.map((calendar) => (
                  <option key={`${calendar.accountId}::${calendar.calendarId}`} value={`${calendar.accountId}::${calendar.calendarId}`}>
                    {calendar.calendarLabel} / {calendar.accountLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
              予定名
              <input className="h-10 rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400" value={title} onChange={(event) => setTitle(event.target.value)} disabled={isSubmitting} autoFocus />
            </label>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
                日付
                <input className="h-10 rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400" type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} disabled={isSubmitting} />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm text-zinc-700">
                <input className="h-4 w-4 accent-zinc-950" type="checkbox" checked={isAllDay} onChange={(event) => setIsAllDay(event.target.checked)} disabled={isSubmitting} />
                終日
              </label>
            </div>

            {!isAllDay ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
                  開始
                  <input className="h-10 rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={isSubmitting} />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
                  終了
                  <input className="h-10 rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={isSubmitting} />
                </label>
              </div>
            ) : null}

            <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
              繰り返し
              <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400" value={recurrencePreset} onChange={(event) => setRecurrencePreset(event.target.value as RecurrencePreset)} disabled={isSubmitting}>
                <option value="none">なし</option>
                <option value="daily">毎日</option>
                <option value="weekly">毎週 {WEEKDAY_LABELS[selectedWeekday]}曜日</option>
                <option value="monthly">毎月</option>
                <option value="yearly">毎年</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
              場所
              <input className="h-10 rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400" value={location} onChange={(event) => setLocation(event.target.value)} disabled={isSubmitting} />
            </label>

            <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
              メモ
              <textarea className="min-h-20 resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-400" value={description} onChange={(event) => setDescription(event.target.value)} disabled={isSubmitting} />
            </label>
          </div>

          <DialogFooter className="border-t border-zinc-100 px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>キャンセル</Button>
            <Button type="submit" disabled={isSubmitting || writableCalendars.length === 0}>{isSubmitting ? "作成中..." : "作成"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { MobileCalendarEventComposer };
