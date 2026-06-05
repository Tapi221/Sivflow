import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type MobileCalendarWritableCalendarOption = { key: string; accountId: string; calendarId: string; label: string; accountLabel: string; calendarLabel: string; color: string; projectId?: string; isSelected: boolean };
type MobileCalendarEventFormState = { title: string; location: string; isAllDay: boolean; startDate: string; startTime: string; endDate: string; endTime: string; calendarKey: string; description: string };
type MobileEventDates = { startsAt: Date; endsAt: Date; isAllDay: boolean };
type MobileCalendarEventComposerProps = { isOpen: boolean; selectedDate: Date; accounts: GoogleAccountDisplay[]; projectCalendarLinks: ProjectCalendarLink[]; onClose: () => void; onAddCalendar: () => Promise<void>; onCreateEvent: (accountId: string, event: GCalWritableEventInput) => Promise<GoogleCalendarEvent> };

const MOBILE_EVENT_COMPOSER_DEFAULT_START_HOUR = 9;
const MOBILE_EVENT_COMPOSER_DEFAULT_DURATION_HOURS = 1;
const MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR = "#34c759";
const MOBILE_EVENT_COMPOSER_TOP_GAP = 34;
const MOBILE_EVENT_COMPOSER_DISMISS_DRAG_DISTANCE = 96;

const isSameLocalDate = (left: Date, right: Date): boolean => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();

const getGoogleAccountLabel = (account: GoogleAccountDisplay): string => account.name ?? account.email ?? "Google";

const getGoogleCalendarLabel = (calendarLabel: string): string => calendarLabel.trim() || "カレンダー";

const createMobileCalendarOptionKey = (accountId: string, calendarId: string): string => JSON.stringify([accountId, calendarId]);

const findProjectIdForGoogleCalendar = (projectCalendarLinks: ProjectCalendarLink[], accountId: string, calendarId: string): string | undefined => projectCalendarLinks.find((link) => link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId)?.projectId;

const buildMobileCalendarOptions = (accounts: GoogleAccountDisplay[], projectCalendarLinks: ProjectCalendarLink[]): MobileCalendarWritableCalendarOption[] => {
  const includeAccountLabel = accounts.length > 1;
  const options = accounts.flatMap((account) => {
    const accountLabel = getGoogleAccountLabel(account);

    return account.calendars.map((calendar) => {
      const calendarLabel = getGoogleCalendarLabel(calendar.summaryOverride ?? calendar.summary);
      const key = createMobileCalendarOptionKey(account.accountId, calendar.id);
      const label = includeAccountLabel ? `${calendarLabel}（${accountLabel}）` : calendarLabel;

      return { key, accountId: account.accountId, calendarId: calendar.id, label, accountLabel, calendarLabel, color: calendar.backgroundColor ?? MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR, projectId: findProjectIdForGoogleCalendar(projectCalendarLinks, account.accountId, calendar.id), isSelected: account.selectedCalendarIds.has(calendar.id) };
    });
  });

  return [...options.filter((option) => option.isSelected), ...options.filter((option) => !option.isSelected)];
};

const createDateAtTime = (date: Date, hour: number, minute = 0): Date => {
  const nextDate = new Date(date);
  nextDate.setHours(hour, minute, 0, 0);
  return nextDate;
};

const createDefaultTimedEventStart = (selectedDate: Date): Date => {
  const now = new Date();

  if (isSameLocalDate(now, selectedDate)) return createDateAtTime(selectedDate, now.getHours() + 1, 0);

  return createDateAtTime(selectedDate, MOBILE_EVENT_COMPOSER_DEFAULT_START_HOUR, 0);
};

const toInputDateValue = (date: Date): string => format(date, "yyyy-MM-dd");

const toInputTimeValue = (date: Date): string => format(date, "HH:mm");

const parseDateInputValue = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseTimeInputValue = (value: string): { hours: number; minutes: number } | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, hours, minutes] = match;
  return { hours: Number(hours), minutes: Number(minutes) };
};

const buildTimedDate = (dateValue: string, timeValue: string): Date | null => {
  const date = parseDateInputValue(dateValue);
  const time = parseTimeInputValue(timeValue);
  if (!date || !time) return null;

  date.setHours(time.hours, time.minutes, 0, 0);
  return date;
};

const buildMobileEventDates = (form: MobileCalendarEventFormState): MobileEventDates | null => {
  const startDate = parseDateInputValue(form.startDate);
  if (!startDate) return null;

  if (form.isAllDay) {
    const parsedEndDate = parseDateInputValue(form.endDate) ?? startDate;
    const endDate = parsedEndDate < startDate ? startDate : parsedEndDate;

    return { startsAt: startOfDay(startDate), endsAt: startOfDay(addDays(endDate, 1)), isAllDay: true };
  }

  const startsAt = buildTimedDate(form.startDate, form.startTime);
  const rawEndsAt = buildTimedDate(form.endDate, form.endTime);
  if (!startsAt || !rawEndsAt) return null;

  return { startsAt, endsAt: rawEndsAt <= startsAt ? addHours(startsAt, MOBILE_EVENT_COMPOSER_DEFAULT_DURATION_HOURS) : rawEndsAt, isAllDay: false };
};

const createInitialEventFormState = (selectedDate: Date, calendarOptions: MobileCalendarWritableCalendarOption[]): MobileCalendarEventFormState => {
  const startsAt = createDefaultTimedEventStart(selectedDate);
  const endsAt = addHours(startsAt, MOBILE_EVENT_COMPOSER_DEFAULT_DURATION_HOURS);

  return { title: "", location: "", isAllDay: false, startDate: toInputDateValue(startsAt), startTime: toInputTimeValue(startsAt), endDate: toInputDateValue(endsAt), endTime: toInputTimeValue(endsAt), calendarKey: calendarOptions[0]?.key ?? "", description: "" };
};

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : "予定の追加に失敗しました";

const isInteractiveComposerSwipeTarget = (target: EventTarget | null): boolean => target instanceof HTMLElement && Boolean(target.closest("button,input,select,textarea,a"));

const MobileCalendarEventComposer = ({ isOpen, selectedDate, accounts, projectCalendarLinks, onClose, onAddCalendar, onCreateEvent }: MobileCalendarEventComposerProps) => {
  const calendarOptions = useMemo(() => buildMobileCalendarOptions(accounts, projectCalendarLinks), [accounts, projectCalendarLinks]);
  const [form, setForm] = useState<MobileCalendarEventFormState>(() => createInitialEventFormState(selectedDate, calendarOptions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const selectedCalendarOption = useMemo(() => calendarOptions.find((option) => option.key === form.calendarKey) ?? null, [calendarOptions, form.calendarKey]);
  const isSubmitDisabled = isSubmitting || !form.title.trim() || !selectedCalendarOption;
  const sheetStyle = useMemo<CSSProperties>(() => ({ transform: `translateY(${dragOffset}px)`, transition: dragStartYRef.current === null ? "transform 180ms ease-out" : "none" }), [dragOffset]);

  useEffect(() => {
    if (!isOpen) return;

    setForm(createInitialEventFormState(selectedDate, calendarOptions));
    setIsSubmitting(false);
    setError(null);
    setDragOffset(0);
    dragStartYRef.current = null;
  }, [calendarOptions, isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const setFormValue = useCallback((patch: Partial<MobileCalendarEventFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;

    onClose();
  }, [isSubmitting, onClose]);

  const handleAddCalendar = useCallback(() => {
    void onAddCalendar().catch((caughtError) => {
      setError(getErrorMessage(caughtError));
    });
  }, [onAddCalendar]);

  const handleSubmit = useCallback(() => {
    if (isSubmitDisabled || !selectedCalendarOption) return;

    const eventDates = buildMobileEventDates(form);
    if (!eventDates) {
      setError("開始日時と終了日時を確認してください");
      return;
    }

    const writableEvent: GCalWritableEventInput = { calendarId: selectedCalendarOption.calendarId, title: form.title.trim(), startsAt: eventDates.startsAt, endsAt: eventDates.endsAt, isAllDay: eventDates.isAllDay };
    const trimmedLocation = form.location.trim();
    const trimmedDescription = form.description.trim();
    if (trimmedLocation) writableEvent.location = trimmedLocation;
    if (trimmedDescription) writableEvent.description = trimmedDescription;
    if (selectedCalendarOption.projectId) writableEvent.projectId = selectedCalendarOption.projectId;

    setIsSubmitting(true);
    setError(null);
    void onCreateEvent(selectedCalendarOption.accountId, writableEvent)
      .then(() => {
        onClose();
      })
      .catch((caughtError) => {
        setError(getErrorMessage(caughtError));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [form, isSubmitDisabled, onClose, onCreateEvent, selectedCalendarOption]);

  const handleSheetPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (isSubmitting || isInteractiveComposerSwipeTarget(event.target)) return;

    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [isSubmitting]);

  const handleSheetPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (dragStartYRef.current === null) return;

    setDragOffset(Math.max(0, event.clientY - dragStartYRef.current));
  }, []);

  const handleSheetPointerEnd = useCallback(() => {
    if (dragStartYRef.current === null) return;

    dragStartYRef.current = null;
    if (dragOffset >= MOBILE_EVENT_COMPOSER_DISMISS_DRAG_DISTANCE) {
      handleClose();
      return;
    }

    setDragOffset(0);
  }, [dragOffset, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] flex justify-center bg-black/35" role="presentation" style={{ top: MOBILE_EVENT_COMPOSER_TOP_GAP }}>
      <section role="dialog" aria-modal="true" aria-labelledby="mobile-calendar-event-composer-title" className="flex h-full w-full max-w-[720px] flex-col overflow-hidden rounded-t-[26px] border border-[#2a3241] bg-[#121826] shadow-[0_-14px_44px_rgba(0,0,0,0.38)]" style={sheetStyle}>
        <header className="flex h-[58px] shrink-0 touch-none items-center justify-between border-b border-[#2b3343] bg-[#171e2c]/90 px-4 backdrop-blur" onPointerDown={handleSheetPointerDown} onPointerMove={handleSheetPointerMove} onPointerUp={handleSheetPointerEnd} onPointerCancel={handleSheetPointerEnd}>
          <button type="button" className="text-[17px] font-medium tracking-[-0.03em] text-[#8fb3ff] disabled:text-[#596579]" onClick={handleClose} disabled={isSubmitting}>キャンセル</button>
          <h2 id="mobile-calendar-event-composer-title" className="text-[17px] font-bold tracking-[-0.03em] text-[#f8fafc]">新規イベント</h2>
          <button type="button" className="text-[17px] font-semibold tracking-[-0.03em] text-[#8fb3ff] disabled:text-[#596579]" onClick={handleSubmit} disabled={isSubmitDisabled}>{isSubmitting ? "追加中" : "追加"}</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
          <div className="overflow-hidden rounded-[14px] bg-[#1a2130]">
            <input className="h-[56px] w-full border-0 border-b border-[#2b3343] bg-transparent px-4 text-[21px] font-normal tracking-[-0.03em] text-[#f8fafc] outline-none placeholder:text-[#6f7a8c]" value={form.title} onChange={(event) => setFormValue({ title: event.target.value })} placeholder="タイトル" inputMode="text" />
            <input className="h-[48px] w-full border-0 bg-transparent px-4 text-[17px] tracking-[-0.03em] text-[#f8fafc] outline-none placeholder:text-[#6f7a8c]" value={form.location} onChange={(event) => setFormValue({ location: event.target.value })} placeholder="場所またはビデオ通話" inputMode="text" />
          </div>

          <div className="mt-5 overflow-hidden rounded-[14px] bg-[#1a2130]">
            <div className="flex min-h-[52px] items-center justify-between border-b border-[#2b3343] px-4">
              <span className="text-[17px] tracking-[-0.03em] text-[#e5e7eb]">終日</span>
              <button type="button" role="switch" aria-checked={form.isAllDay} className={cn("relative h-[31px] w-[51px] rounded-full transition", form.isAllDay ? "bg-[#7aa2ff]" : "bg-[#3a4150]")} onClick={() => setFormValue({ isAllDay: !form.isAllDay })}>
                <span className={cn("absolute top-[2px] h-[27px] w-[27px] rounded-full bg-[#f8fafc] shadow-[0_2px_4px_rgba(0,0,0,0.35)] transition-transform", form.isAllDay ? "translate-x-[22px]" : "translate-x-[2px]")} />
              </button>
            </div>
            <label className="flex min-h-[52px] items-center justify-between gap-3 border-b border-[#2b3343] px-4">
              <span className="text-[17px] tracking-[-0.03em] text-[#e5e7eb]">開始</span>
              <span className="flex min-w-0 items-center gap-2">
                <input type="date" className="h-9 rounded-[10px] bg-[#111827] px-2 text-right text-[17px] tracking-[-0.03em] text-[#f8fafc] outline-none scheme-dark" value={form.startDate} onChange={(event) => setFormValue({ startDate: event.target.value })} />
                {!form.isAllDay && <input type="time" className="h-9 w-[92px] rounded-[10px] bg-[#111827] px-2 text-right text-[17px] tracking-[-0.03em] text-[#f8fafc] outline-none scheme-dark" value={form.startTime} onChange={(event) => setFormValue({ startTime: event.target.value })} />}
              </span>
            </label>
            <label className="flex min-h-[52px] items-center justify-between gap-3 border-b border-[#2b3343] px-4">
              <span className="text-[17px] tracking-[-0.03em] text-[#e5e7eb]">終了</span>
              <span className="flex min-w-0 items-center gap-2">
                <input type="date" className="h-9 rounded-[10px] bg-[#111827] px-2 text-right text-[17px] tracking-[-0.03em] text-[#f8fafc] outline-none scheme-dark" value={form.endDate} onChange={(event) => setFormValue({ endDate: event.target.value })} />
                {!form.isAllDay && <input type="time" className="h-9 w-[92px] rounded-[10px] bg-[#111827] px-2 text-right text-[17px] tracking-[-0.03em] text-[#f8fafc] outline-none scheme-dark" value={form.endTime} onChange={(event) => setFormValue({ endTime: event.target.value })} />}
              </span>
            </label>
            <div className="flex min-h-[52px] items-center justify-between px-4">
              <span className="text-[17px] tracking-[-0.03em] text-[#e5e7eb]">移動時間</span>
              <span className="text-[17px] tracking-[-0.03em] text-[#98a2b3]">なし</span>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[14px] bg-[#1a2130]">
            {calendarOptions.length > 0 ? (
              <label className="flex min-h-[52px] items-center justify-between gap-4 px-4">
                <span className="text-[17px] tracking-[-0.03em] text-[#e5e7eb]">カレンダー</span>
                <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selectedCalendarOption?.color ?? MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR }} />
                  <select className="min-w-0 max-w-[70%] bg-transparent text-right text-[17px] tracking-[-0.03em] text-[#98a2b3] outline-none scheme-dark [&>option]:bg-[#1a2130] [&>option]:text-[#f8fafc]" value={form.calendarKey} onChange={(event) => setFormValue({ calendarKey: event.target.value })}>
                    {calendarOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                </span>
              </label>
            ) : (
              <div className="flex min-h-[84px] items-center justify-between gap-4 px-4 py-3">
                <p className="min-w-0 text-[15px] leading-5 tracking-[-0.03em] text-[#98a2b3]">Google カレンダーを接続すると予定を追加できます。</p>
                <button type="button" className="shrink-0 rounded-full bg-[#111827] px-3 py-2 text-[14px] font-semibold tracking-[-0.03em] text-[#8fb3ff]" onClick={handleAddCalendar}>接続</button>
              </div>
            )}
          </div>

          <div className="mt-5 overflow-hidden rounded-[14px] bg-[#1a2130]">
            <textarea className="h-[176px] w-full resize-none border-0 bg-transparent px-4 py-3 text-[17px] leading-6 tracking-[-0.03em] text-[#f8fafc] outline-none placeholder:text-[#6f7a8c]" value={form.description} onChange={(event) => setFormValue({ description: event.target.value })} placeholder="メモ" />
          </div>

          {error && <p className="mt-3 px-1 text-[14px] leading-5 tracking-[-0.03em] text-[#fb7185]">{error}</p>}
        </div>
      </section>
    </div>
  );
};

export { MobileCalendarEventComposer };
