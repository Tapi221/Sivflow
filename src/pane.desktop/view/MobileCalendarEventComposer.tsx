import { type SVGProps, type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type MobileCalendarWritableCalendarOption = { key: string; accountId: string; calendarId: string; label: string; accountLabel: string; calendarLabel: string; color: string; projectId?: string; isSelected: boolean };
type MobileCalendarEventFormState = { title: string; location: string; isAllDay: boolean; startDate: string; startTime: string; endDate: string; endTime: string; calendarKey: string; description: string };
type MobileEventDates = { startsAt: Date; endsAt: Date; isAllDay: boolean };
type MobileCalendarTimeFieldName = "startTime" | "endTime";
type MobileCalendarTimeButtonProps = { label: string; value: string; isActive: boolean; onClick: () => void };
type MobileCalendarInlineTimeWheelProps = { value: string; onChange: (value: string) => void };
type MobileCalendarEventComposerProps = {
  isOpen: boolean;
  selectedDate: Date;
  accounts?: GoogleAccountDisplay[];
  googleAccounts?: GoogleAccountDisplay[];
  projectCalendarLinks?: ProjectCalendarLink[];
  onClose: () => void;
  onAddCalendar?: () => Promise<void>;
  onCreateEvent: (accountId: string, event: GCalWritableEventInput) => Promise<GoogleCalendarEvent>;
};

const MOBILE_EVENT_COMPOSER_DEFAULT_START_HOUR = 9;
const MOBILE_EVENT_COMPOSER_DEFAULT_DURATION_HOURS = 1;
const MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR = "#34c759";
const MOBILE_EVENT_LOCATION_CURRENT_VALUE_PREFIX = "現在地";
const MOBILE_EVENT_TIME_WHEEL_ROW_HEIGHT = 44;
const MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT = MOBILE_EVENT_TIME_WHEEL_ROW_HEIGHT * 2;
const MOBILE_EVENT_TIME_WHEEL_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MOBILE_EVENT_TIME_WHEEL_MINUTES = Array.from({ length: 60 }, (_, minute) => minute);
const EMPTY_GOOGLE_ACCOUNTS: GoogleAccountDisplay[] = [];
const EMPTY_PROJECT_CALENDAR_LINKS: ProjectCalendarLink[] = [];

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

const formatTimeUnit = (value: number): string => String(value).padStart(2, "0");

const createTimeInputValue = (hours: number, minutes: number): string => `${formatTimeUnit(hours)}:${formatTimeUnit(minutes)}`;

const getTimeInputParts = (value: string): { hours: number; minutes: number } => parseTimeInputValue(value) ?? { hours: 0, minutes: 0 };

const clampTimeWheelIndex = (value: number, max: number): number => Math.max(0, Math.min(max, value));

const MobileCalendarSearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M10.8 4.4a6.4 6.4 0 0 1 5.05 10.33l3.51 3.51a.78.78 0 0 1-1.1 1.1l-3.51-3.51A6.4 6.4 0 1 1 10.8 4.4Zm0 1.56a4.84 4.84 0 1 0 0 9.68 4.84 4.84 0 0 0 0-9.68Z" />
  </svg>
);

const MobileCalendarCurrentLocationIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 40 40" aria-hidden="true" {...props}>
    <circle cx="20" cy="20" r="20" fill="#d8d8dd" />
    <path fill="#007aff" d="M30.44 9.84 11.06 18.1c-1.56.67-1.44 2.94.18 3.42l7.02 2.08 2.08 7.02c.48 1.62 2.75 1.74 3.42.18l8.26-19.38c.47-1.1-.48-2.05-1.58-1.58Z" />
  </svg>
);

const MobileCalendarFaceTimeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 600 600" aria-hidden="true" {...props}>
    <path fill="#20d64d" d="M137.7 0h324.6C538.6 0 600 61.4 600 137.7v324.6c0 76.3-61.4 137.7-137.7 137.7H137.7C61.4 600 0 538.6 0 462.3V137.7C0 61.4 61.4 0 137.7 0z" />
    <path fill="#fff" d="M91.5 227.3v146.1c0 31.9 25.9 57.7 57.7 57.7H325c31.9 0 57.7-25.9 57.7-57.7V227.3c0-31.9-25.9-57.7-57.7-57.7H149.3c-31.9-.1-57.8 25.8-57.8 57.7zm379.3-39.1-66.2 54.6c-5.9 4.9-9.3 12.1-9.3 19.7v75.6c0 7.6 3.3 14.7 9.1 19.6l66.2 55.6c15.1 12.6 38 1.9 38-17.7V206c.1-19.5-22.7-30.3-37.8-17.8z" />
  </svg>
);

const MobileCalendarTimeButton = ({ label, value, isActive, onClick }: MobileCalendarTimeButtonProps) => (
  <button type="button" className={cn("h-9 w-[92px] rounded-[10px] px-2 text-right text-[17px] tracking-[-0.03em] outline-none transition tabular-nums", isActive ? "bg-[#ffe9e7] text-[#ff3b30]" : "bg-[#f2f2f7] text-[#111111]")} aria-label={label} aria-pressed={isActive} onClick={onClick}>{value}</button>
);

const MobileCalendarInlineTimeWheel = ({ value, onChange }: MobileCalendarInlineTimeWheelProps) => {
  const { hours, minutes } = getTimeInputParts(value);
  const hourWheelRef = useRef<HTMLDivElement>(null);
  const minuteWheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hourWheelRef.current?.scrollTo({ top: hours * MOBILE_EVENT_TIME_WHEEL_ROW_HEIGHT, behavior: "auto" });
    minuteWheelRef.current?.scrollTo({ top: minutes * MOBILE_EVENT_TIME_WHEEL_ROW_HEIGHT, behavior: "auto" });
  }, [hours, minutes]);

  const handleHourScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const nextHours = clampTimeWheelIndex(Math.round(event.currentTarget.scrollTop / MOBILE_EVENT_TIME_WHEEL_ROW_HEIGHT), 23);
    if (nextHours !== hours) onChange(createTimeInputValue(nextHours, minutes));
  }, [hours, minutes, onChange]);

  const handleMinuteScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const nextMinutes = clampTimeWheelIndex(Math.round(event.currentTarget.scrollTop / MOBILE_EVENT_TIME_WHEEL_ROW_HEIGHT), 59);
    if (nextMinutes !== minutes) onChange(createTimeInputValue(hours, nextMinutes));
  }, [hours, minutes, onChange]);

  return (
    <div className="border-t border-[#e5e5ea] px-4 py-3">
      <div className="relative overflow-hidden rounded-[22px] bg-[#fbfbfd] px-5 py-3 shadow-[inset_0_0_0_1px_rgba(60,60,67,0.12)]" role="group" aria-label="時刻">
        <div aria-hidden="true" className="pointer-events-none absolute left-5 right-5 top-1/2 z-0 h-[44px] -translate-y-1/2 rounded-[13px] bg-[#f2f2f7]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[72px] bg-gradient-to-b from-[#fbfbfd] to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[72px] bg-gradient-to-t from-[#fbfbfd] to-transparent" />
        <div className="relative z-10 grid h-[220px] grid-cols-[1fr_32px_1fr] items-center">
          <div ref={hourWheelRef} className="h-[220px] snap-y snap-mandatory overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={handleHourScroll} aria-label="時">
            <div aria-hidden="true" style={{ height: MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT }} />
            {MOBILE_EVENT_TIME_WHEEL_HOURS.map((hour) => (
              <button key={hour} type="button" className={cn("block h-[44px] w-full snap-center rounded-[10px] text-center tracking-[-0.04em] transition tabular-nums", hour === hours ? "text-[30px] font-semibold text-[#111111]" : "text-[25px] font-normal text-[#8e8e93]")} onClick={() => onChange(createTimeInputValue(hour, minutes))}>{formatTimeUnit(hour)}</button>
            ))}
            <div aria-hidden="true" style={{ height: MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT }} />
          </div>
          <div className="pointer-events-none flex h-[44px] items-center justify-center text-[30px] font-semibold tracking-[-0.04em] text-[#111111]">:</div>
          <div ref={minuteWheelRef} className="h-[220px] snap-y snap-mandatory overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={handleMinuteScroll} aria-label="分">
            <div aria-hidden="true" style={{ height: MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT }} />
            {MOBILE_EVENT_TIME_WHEEL_MINUTES.map((minute) => (
              <button key={minute} type="button" className={cn("block h-[44px] w-full snap-center rounded-[10px] text-center tracking-[-0.04em] transition tabular-nums", minute === minutes ? "text-[30px] font-semibold text-[#111111]" : "text-[25px] font-normal text-[#8e8e93]")} onClick={() => onChange(createTimeInputValue(hours, minute))}>{formatTimeUnit(minute)}</button>
            ))}
            <div aria-hidden="true" style={{ height: MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileCalendarEventComposer = ({ isOpen, selectedDate, accounts, googleAccounts, projectCalendarLinks, onClose, onAddCalendar, onCreateEvent }: MobileCalendarEventComposerProps) => {
  const calendarAccounts = accounts ?? googleAccounts ?? EMPTY_GOOGLE_ACCOUNTS;
  const calendarProjectCalendarLinks = projectCalendarLinks ?? EMPTY_PROJECT_CALENDAR_LINKS;
  const calendarOptions = useMemo(() => buildMobileCalendarOptions(calendarAccounts, calendarProjectCalendarLinks), [calendarAccounts, calendarProjectCalendarLinks]);
  const [form, setForm] = useState<MobileCalendarEventFormState>(() => createInitialEventFormState(selectedDate, calendarOptions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<MobileCalendarTimeFieldName | null>(null);
  const selectedCalendarOption = useMemo(() => calendarOptions.find((option) => option.key === form.calendarKey) ?? null, [calendarOptions, form.calendarKey]);
  const isSubmitDisabled = isSubmitting || !form.title.trim() || !selectedCalendarOption;

  useEffect(() => {
    if (!isOpen) return;

    setForm(createInitialEventFormState(selectedDate, calendarOptions));
    setIsSubmitting(false);
    setError(null);
    setIsLocationSheetOpen(false);
    setActiveTimeField(null);
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
    if (!onAddCalendar) return;

    void onAddCalendar().catch((caughtError) => {
      setError(getErrorMessage(caughtError));
    });
  }, [onAddCalendar]);

  const handleSelectFaceTime = useCallback(() => {
    setFormValue({ location: "FaceTime" });
    setIsLocationSheetOpen(false);
  }, [setFormValue]);

  const handleSelectCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setFormValue({ location: MOBILE_EVENT_LOCATION_CURRENT_VALUE_PREFIX });
      setIsLocationSheetOpen(false);
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const latitude = position.coords.latitude.toFixed(5);
      const longitude = position.coords.longitude.toFixed(5);
      setFormValue({ location: `${MOBILE_EVENT_LOCATION_CURRENT_VALUE_PREFIX}（${latitude}, ${longitude}）` });
      setIsLocationSheetOpen(false);
    }, () => {
      setFormValue({ location: MOBILE_EVENT_LOCATION_CURRENT_VALUE_PREFIX });
      setIsLocationSheetOpen(false);
    }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 });
  }, [setFormValue]);

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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/25" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="mobile-calendar-event-composer-title" className="flex h-[min(92vh,760px)] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[26px] bg-[#f2f2f7] shadow-[0_-12px_40px_rgba(0,0,0,0.20)]">
          <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#d1d1d6] bg-white/80 px-4 backdrop-blur">
            <button type="button" className="text-[17px] font-medium tracking-[-0.03em] text-[#ff3b30] disabled:text-[#c7c7cc]" onClick={handleClose} disabled={isSubmitting}>キャンセル</button>
            <h2 id="mobile-calendar-event-composer-title" className="text-[17px] font-bold tracking-[-0.03em] text-[#111111]">新規イベント</h2>
            <button type="button" className="text-[17px] font-semibold tracking-[-0.03em] text-[#ff3b30] disabled:text-[#c7c7cc]" onClick={handleSubmit} disabled={isSubmitDisabled}>{isSubmitting ? "追加中" : "追加"}</button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
            <div className="overflow-hidden rounded-[14px] bg-white">
              <input className="h-[56px] w-full border-0 border-b border-[#e5e5ea] bg-transparent px-4 text-[21px] font-normal tracking-[-0.03em] text-[#111111] outline-none placeholder:text-[#c7c7cc]" value={form.title} onChange={(event) => setFormValue({ title: event.target.value })} placeholder="タイトル" inputMode="text" />
              <button type="button" className={cn("flex h-[48px] w-full items-center px-4 text-left text-[17px] tracking-[-0.03em] outline-none", form.location.trim() ? "text-[#111111]" : "text-[#c7c7cc]")} onClick={() => { setActiveTimeField(null); setIsLocationSheetOpen(true); }}>
                <span className="min-w-0 flex-1 truncate">{form.location.trim() || "場所またはビデオ通話"}</span>
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
              <div className="flex min-h-[52px] items-center justify-between border-b border-[#e5e5ea] px-4">
                <span className="text-[17px] tracking-[-0.03em] text-[#111111]">終日</span>
                <button type="button" role="switch" aria-checked={form.isAllDay} className={cn("relative h-[31px] w-[51px] rounded-full transition", form.isAllDay ? "bg-[#34c759]" : "bg-[#e5e5ea]")} onClick={() => { setFormValue({ isAllDay: !form.isAllDay }); setActiveTimeField(null); }}>
                  <span className={cn("absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.22)] transition-transform", form.isAllDay ? "translate-x-[22px]" : "translate-x-[2px]")} />
                </button>
              </div>
              <div className="border-b border-[#e5e5ea]">
                <div className="flex min-h-[52px] items-center justify-between gap-3 px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">開始</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <input type="date" className="h-9 rounded-[10px] bg-[#f2f2f7] px-2 text-right text-[17px] tracking-[-0.03em] text-[#111111] outline-none" value={form.startDate} onChange={(event) => setFormValue({ startDate: event.target.value })} onFocus={() => setActiveTimeField(null)} />
                    {!form.isAllDay && <MobileCalendarTimeButton label="開始時刻" value={form.startTime} isActive={activeTimeField === "startTime"} onClick={() => setActiveTimeField((current) => current === "startTime" ? null : "startTime")} />}
                  </span>
                </div>
                {!form.isAllDay && activeTimeField === "startTime" ? <MobileCalendarInlineTimeWheel value={form.startTime} onChange={(startTime) => setFormValue({ startTime })} /> : null}
              </div>
              <div className="border-b border-[#e5e5ea]">
                <div className="flex min-h-[52px] items-center justify-between gap-3 px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">終了</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <input type="date" className="h-9 rounded-[10px] bg-[#f2f2f7] px-2 text-right text-[17px] tracking-[-0.03em] text-[#111111] outline-none" value={form.endDate} onChange={(event) => setFormValue({ endDate: event.target.value })} onFocus={() => setActiveTimeField(null)} />
                    {!form.isAllDay && <MobileCalendarTimeButton label="終了時刻" value={form.endTime} isActive={activeTimeField === "endTime"} onClick={() => setActiveTimeField((current) => current === "endTime" ? null : "endTime")} />}
                  </span>
                </div>
                {!form.isAllDay && activeTimeField === "endTime" ? <MobileCalendarInlineTimeWheel value={form.endTime} onChange={(endTime) => setFormValue({ endTime })} /> : null}
              </div>
              <div className="flex min-h-[52px] items-center justify-between px-4">
                <span className="text-[17px] tracking-[-0.03em] text-[#111111]">移動時間</span>
                <span className="text-[17px] tracking-[-0.03em] text-[#8e8e93]">なし</span>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
              {calendarOptions.length > 0 ? (
                <label className="flex min-h-[52px] items-center justify-between gap-4 px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">カレンダー</span>
                  <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selectedCalendarOption?.color ?? MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR }} />
                    <select className="min-w-0 max-w-[70%] bg-transparent text-right text-[17px] tracking-[-0.03em] text-[#8e8e93] outline-none" value={form.calendarKey} onChange={(event) => setFormValue({ calendarKey: event.target.value })}>
                      {calendarOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                  </span>
                </label>
              ) : (
                <div className="flex min-h-[84px] items-center justify-between gap-4 px-4 py-3">
                  <p className="min-w-0 text-[15px] leading-5 tracking-[-0.03em] text-[#6e6e73]">Google カレンダーを接続すると予定を追加できます。</p>
                  <button type="button" className="shrink-0 rounded-full bg-[#f2f2f7] px-3 py-2 text-[14px] font-semibold tracking-[-0.03em] text-[#ff3b30]" onClick={handleAddCalendar}>接続</button>
                </div>
              )}
            </div>

            <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
              <textarea className="h-[176px] w-full resize-none border-0 bg-transparent px-4 py-3 text-[17px] leading-6 tracking-[-0.03em] text-[#111111] outline-none placeholder:text-[#c7c7cc]" value={form.description} onChange={(event) => setFormValue({ description: event.target.value })} placeholder="メモ" />
            </div>

            {error && <p className="mt-3 px-1 text-[14px] leading-5 tracking-[-0.03em] text-[#ff3b30]">{error}</p>}
          </div>
        </section>
      </div>

      {isLocationSheetOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/10" role="presentation">
          <section role="dialog" aria-modal="true" aria-label="場所" className="flex h-[min(88vh,720px)] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[13px] bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)] [text-size-adjust:100%] [-webkit-text-size-adjust:100%]">
            <header className="relative flex h-[58px] shrink-0 items-center px-[32px]">
              <h3 className="pointer-events-none absolute left-1/2 top-1/2 w-[180px] -translate-x-1/2 -translate-y-1/2 text-center text-[18px] font-bold tracking-[-0.03em] text-[#111111]">場所</h3>
              <button type="button" className="ml-auto min-w-[92px] text-right text-[18px] font-normal tracking-[-0.03em] text-[#ff3b30]" onClick={() => setIsLocationSheetOpen(false)}>キャンセル</button>
            </header>

            <div className="px-[32px] pb-[28px] pt-[8px]">
              <label className="flex h-[68px] items-center rounded-[12px] bg-[#f1f1f3] px-[12px]">
                <MobileCalendarSearchIcon className="mr-[8px] h-[30px] w-[30px] shrink-0 text-[#8e8e93]" />
                <input autoFocus className="min-w-0 flex-1 border-0 bg-transparent text-[19px] leading-none tracking-[-0.04em] text-[#111111] outline-none placeholder:text-[#8e8e93]" value={form.location} onChange={(event) => setFormValue({ location: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") setIsLocationSheetOpen(false); }} placeholder="場所またはビデオ通話を入力" inputMode="text" />
              </label>
            </div>

            <div className="h-px bg-[#d1d1d6]" />

            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              <button type="button" className="flex min-h-[106px] w-full items-center gap-[20px] border-b border-[#d1d1d6] px-[32px] text-left" onClick={handleSelectCurrentLocation}>
                <MobileCalendarCurrentLocationIcon className="h-[56px] w-[56px] shrink-0" />
                <span className="text-[22px] tracking-[-0.04em] text-[#111111]">現在地</span>
              </button>

              <div className="border-b border-[#d1d1d6] bg-[#fafafa] px-[32px] pb-[13px] pt-[55px]">
                <span className="text-[21px] font-bold tracking-[-0.04em] text-[#8e8e93]">ビデオ通話</span>
              </div>

              <button type="button" className="flex min-h-[123px] w-full items-center gap-[20px] border-b border-[#d1d1d6] px-[32px] text-left" onClick={handleSelectFaceTime}>
                <MobileCalendarFaceTimeIcon className="h-[66px] w-[66px] shrink-0" />
                <span className="text-[22px] tracking-[-0.04em] text-[#111111]">FaceTime</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
};

export { MobileCalendarEventComposer };
