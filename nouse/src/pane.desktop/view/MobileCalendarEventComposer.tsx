import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToggleSwitch } from "@web-renderer/chip/toggle/Toggle.switch";
import { cn } from "@web-renderer/lib/utils";
import { addDays, addHours, format, startOfDay } from "date-fns";
import type { SVGProps, UIEvent } from "react";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type MobileCalendarWritableCalendarOption = {
  key: string; accountId: string; calendarId: string; label: string; accountLabel: string; calendarLabel: string; color: string; projectId?: string; isSelected: boolean; };
type MobileCalendarEventFormState = {
  title: string; location: string; isAllDay: boolean; startDate: string; startTime: string; endDate: string; endTime: string; calendarKey: string; description: string; };
type MobileEventDates = {
  startsAt: Date; endsAt: Date; isAllDay: boolean; };
type MobileCalendarPickerFieldName = "startDate" | "startTime" | "endDate" | "endTime";
type MobileCalendarDateButtonProps = {
  label: string; value: string; isActive: boolean; onClick: () => void; };
type MobileCalendarTimeButtonProps = {
  label: string; value: string; isActive: boolean; onClick: () => void; };
type MobileCalendarInlineDatePickerProps = {
  value: string; onChange: (value: string) => void; };
type MobileCalendarInlineTimeWheelProps = {
  value: string; onChange: (value: string) => void; };
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
const MOBILE_EVENT_DATE_GRID_CELL_COUNT = 42;
const MOBILE_EVENT_DATE_WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const MOBILE_EVENT_TIME_WHEEL_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MOBILE_EVENT_TIME_WHEEL_MINUTES = Array.from({ length: 60 }, (_, minute) => minute);
const EMPTY_GOOGLE_ACCOUNTS: GoogleAccountDisplay[] = [];
const EMPTY_PROJECT_CALENDAR_LINKS: ProjectCalendarLink[] = [];



const isSameLocalDate = (left: Date, right: Date): boolean => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
const getGoogleAccountLabel = (account: GoogleAccountDisplay): string => account.name ?? account.email ?? "Google";
const getGoogleCalendarLabel = (calendarLabel: string): string => calendarLabel.trim() ?? "カレンダー";
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
const parseTimeInputValue = (value: string): { hours: number; minutes: number; } | null => {
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
const formatDateButtonValue = (value: string): string => {
  const date = parseDateInputValue(value);
  return date ? format(date, "yyyy/MM/dd") : value;
};
const formatDateUnit = (value: number): string => String(value).padStart(2, "0");
const formatTimeUnit = (value: number): string => String(value).padStart(2, "0");
const createDateInputValue = (year: number, month: number, day: number): string => `${year}-${formatDateUnit(month)}-${formatDateUnit(day)}`;
const createTimeInputValue = (hours: number, minutes: number): string => `${formatTimeUnit(hours)}:${formatTimeUnit(minutes)}`;
const getDateInputParts = (value: string): { year: number; month: number; day: number; } => {
  const date = parseDateInputValue(value) ?? new Date();
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
};
const getTimeInputParts = (value: string): { hours: number; minutes: number; } => parseTimeInputValue(value) ?? { hours: 0, minutes: 0 };
const clampTimeWheelIndex = (value: number, max: number): number => Math.max(0, Math.min(max, value));
const createMonthDateGrid = (year: number, month: number): Date[] => {
  const firstDate = new Date(year, month - 1, 1);
  const gridStartDate = addDays(firstDate, -firstDate.getDay());
  return Array.from({ length: MOBILE_EVENT_DATE_GRID_CELL_COUNT }, (_, index) => addDays(gridStartDate, index));
};
const createShiftedMonthParts = (year: number, month: number, offset: number): { year: number; month: number; } => {
  const shiftedDate = new Date(year, month - 1 + offset, 1);
  return { year: shiftedDate.getFullYear(), month: shiftedDate.getMonth() + 1 };
};
const isDateInMonth = (date: Date, year: number, month: number): boolean => date.getFullYear() === year && date.getMonth() === month - 1;



// ─── Icons ────────────────────────────────────────────────────────────────────
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
const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.71a1 1 0 0 0-1.41 0Z" />
  </svg>
);
// ─── Date Button ──────────────────────────────────────────────────────────────
const MobileCalendarDateButton = ({ label, value, isActive, onClick }: MobileCalendarDateButtonProps) => (
  <button
    type="button"
    className={cn(
      "h-9 min-w-36 rounded-xl px-3 text-right text-base tracking-tight outline-none transition-colors tabular-nums font-medium",
      isActive
        ? "bg-[#ff3b30]/10 text-[#ff3b30]"
        : "bg-[#f2f2f7] text-neutral-950",
    )}
    aria-label={label}
    aria-pressed={isActive}
    onClick={onClick}
  >
    {formatDateButtonValue(value)}
  </button>
);
// ─── Time Button ──────────────────────────────────────────────────────────────
const MobileCalendarTimeButton = ({ label, value, isActive, onClick }: MobileCalendarTimeButtonProps) => (
  <button
    type="button"
    className={cn(
      "h-9 w-20 rounded-xl px-2 text-right text-base tracking-tight outline-none transition-colors tabular-nums font-medium",
      isActive
        ? "bg-[#ff3b30]/10 text-[#ff3b30]"
        : "bg-[#f2f2f7] text-neutral-950",
    )}
    aria-label={label}
    aria-pressed={isActive}
    onClick={onClick}
  >
    {value}
  </button>
);
// ─── Inline Date Picker ───────────────────────────────────────────────────────
const MobileCalendarInlineDatePicker = ({ value, onChange }: MobileCalendarInlineDatePickerProps) => {
  const { year, month, day } = getDateInputParts(value);
  const selectedDate = useMemo(() => new Date(year, month - 1, day), [day, month, year]);
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => ({ year, month }));
  const visibleDates = useMemo(() => createMonthDateGrid(visibleMonth.year, visibleMonth.month), [visibleMonth.month, visibleMonth.year]);

  useEffect(() => {
    setVisibleMonth({ year, month });
  }, [month, year]);

  const handleMoveMonth = useCallback((offset: number) => {
    setVisibleMonth((current) => createShiftedMonthParts(current.year, current.month, offset));
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    onChange(createDateInputValue(date.getFullYear(), date.getMonth() + 1, date.getDate()));
  }, [onChange]);

  return (
    <div className="border-t border-zinc-200 px-4 py-3 animate-in slide-in-from-top-1 duration-200">
      <div className="rounded-2xl bg-[#fbfbfd] px-4 pb-4 pt-3 shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.18)]">
        {/* Month navigation */}
        <div className="mb-2 flex h-9 items-center justify-between">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-blue-500 transition-colors active:bg-[#f2f2f7]"
            aria-label="前の月"
            onClick={() => handleMoveMonth(-1)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="currentColor" d="M14.71 6.71a1 1 0 0 0-1.41 0L8.71 11.3a1 1 0 0 0 0 1.41l4.59 4.59a1 1 0 1 0 1.41-1.41L10.83 12l3.88-3.88a1 1 0 0 0 0-1.41Z" />
            </svg>
          </button>
          <div className="text-sm font-semibold tracking-tight text-neutral-950">
            {visibleMonth.year}年{visibleMonth.month}月
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-blue-500 transition-colors active:bg-[#f2f2f7]"
            aria-label="次の月"
            onClick={() => handleMoveMonth(1)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="currentColor" d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.71a1 1 0 0 0-1.41 0Z" />
            </svg>
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 pb-1">
          {MOBILE_EVENT_DATE_WEEKDAY_LABELS.map((label, index) => (
            <div
              key={label}
              className={cn(
                "h-7 text-center text-xs font-semibold leading-7 tracking-tight",
                index === 0 ? "text-[#ff3b30]" : index === 6 ? "text-blue-500" : "text-zinc-500",
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {visibleDates.map((date) => {
            const isSelected = isSameLocalDate(date, selectedDate);
            const isToday = isSameLocalDate(date, today);
            const isCurrentMonth = isDateInMonth(date, visibleMonth.year, visibleMonth.month);
            const isSunday = date.getDay() === 0;
            const isSaturday = date.getDay() === 6;

            return (
              <button
                key={date.toISOString()}
                type="button"
                className="flex h-9 items-center justify-center rounded-full outline-none"
                onClick={() => handleSelectDate(date)}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm tracking-tight tabular-nums transition-colors",
                    isSelected
                      ? "bg-[#ff3b30] font-semibold text-white"
                      : isToday
                        ? "font-semibold text-[#ff3b30]"
                        : !isCurrentMonth
                          ? "text-[#c7c7cc]"
                          : isSunday
                            ? "text-[#ff3b30]"
                            : isSaturday
                              ? "text-blue-500"
                              : "text-neutral-950",
                  )}
                >
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
// ─── Inline Time Wheel ────────────────────────────────────────────────────────
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
    <div className="border-t border-zinc-200 px-4 py-3 animate-in slide-in-from-top-1 duration-200">
      <div
        className="relative overflow-hidden rounded-2xl bg-[#fbfbfd] px-5 py-3 shadow-[inset_0_0_0_0.5px_rgba(60,60,67,0.18)]"
        role="group"
        aria-label="時刻"
      >
        {/* Selection highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-5 right-5 top-1/2 z-0 h-11 -translate-y-1/2 rounded-xl bg-[#f2f2f7]"
        />
        {/* Fade overlays */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-[#fbfbfd] to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-[#fbfbfd] to-transparent" />
        <div className="relative z-10 grid h-56 grid-cols-[1fr_28px_1fr] items-center">
          {/* Hour wheel */}
          <div
            ref={hourWheelRef}
            className="h-56 snap-y snap-mandatory overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={handleHourScroll}
            aria-label="時"
          >
            <div aria-hidden="true" style={{ height: MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT }} />
            {MOBILE_EVENT_TIME_WHEEL_HOURS.map((hour) => (
              <button
                key={hour}
                type="button"
                className={cn(
                  "block h-11 w-full snap-center rounded-xl text-center tracking-tighter transition-all tabular-nums",
                  hour === hours
                    ? "text-3xl font-semibold text-neutral-950"
                    : "text-2xl font-normal text-zinc-500",
                )}
                onClick={() => onChange(createTimeInputValue(hour, minutes))}
              >
                {formatTimeUnit(hour)}
              </button>
            ))}
            <div aria-hidden="true" style={{ height: MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT }} />
          </div>

          {/* Colon separator */}
          <div className="pointer-events-none flex h-11 items-center justify-center text-3xl font-semibold tracking-tighter text-neutral-950">
            :
          </div>

          {/* Minute wheel */}
          <div
            ref={minuteWheelRef}
            className="h-56 snap-y snap-mandatory overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={handleMinuteScroll}
            aria-label="分"
          >
            <div aria-hidden="true" style={{ height: MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT }} />
            {MOBILE_EVENT_TIME_WHEEL_MINUTES.map((minute) => (
              <button
                key={minute}
                type="button"
                className={cn(
                  "block h-11 w-full snap-center rounded-xl text-center tracking-tighter transition-all tabular-nums",
                  minute === minutes
                    ? "text-3xl font-semibold text-neutral-950"
                    : "text-2xl font-normal text-zinc-500",
                )}
                onClick={() => onChange(createTimeInputValue(hours, minute))}
              >
                {formatTimeUnit(minute)}
              </button>
            ))}
            <div aria-hidden="true" style={{ height: MOBILE_EVENT_TIME_WHEEL_PADDING_HEIGHT }} />
          </div>
        </div>
      </div>
    </div>
  );
};
// ─── Main Composer ────────────────────────────────────────────────────────────
const MobileCalendarEventComposer = ({
  isOpen,
  selectedDate,
  accounts,
  googleAccounts,
  projectCalendarLinks,
  onClose,
  onAddCalendar,
  onCreateEvent,
}: MobileCalendarEventComposerProps) => {
  const calendarAccounts = accounts ?? googleAccounts ?? EMPTY_GOOGLE_ACCOUNTS;
  const calendarProjectCalendarLinks = projectCalendarLinks ?? EMPTY_PROJECT_CALENDAR_LINKS;
  const calendarOptions = useMemo(() => buildMobileCalendarOptions(calendarAccounts, calendarProjectCalendarLinks), [calendarAccounts, calendarProjectCalendarLinks]);
  const calendarOptionsRef = useRef(calendarOptions);
  const selectedDateTime = selectedDate.getTime();

  const [form, setForm] = useState<MobileCalendarEventFormState>(() => createInitialEventFormState(selectedDate, calendarOptions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [activePickerField, setActivePickerField] = useState<MobileCalendarPickerFieldName | null>(null);

  const selectedCalendarOption = useMemo(() => calendarOptions.find((option) => option.key === form.calendarKey) ?? null, [calendarOptions, form.calendarKey]);
  const isSubmitDisabled = isSubmitting || !form.title.trim() || !selectedCalendarOption;

  useEffect(() => {
    calendarOptionsRef.current = calendarOptions; }, [calendarOptions]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(createInitialEventFormState(new Date(selectedDateTime), calendarOptionsRef.current));
    setIsSubmitting(false);
    setError(null);
    setIsLocationSheetOpen(false);
    setActivePickerField(null);
  }, [isOpen, selectedDateTime]);

  useEffect(() => {
    if (!isOpen) return;
    setForm((current) => {
      if (current.calendarKey && calendarOptions.some((option) => option.key === current.calendarKey)) return current;
      const calendarKey = calendarOptions[0]?.key ?? "";
      if (current.calendarKey === calendarKey) return current;
      return { ...current, calendarKey };
    });
  }, [calendarOptions, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow; };
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
      setError(getErrorMessage(caughtError)); });
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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(5);
        const longitude = position.coords.longitude.toFixed(5);
        setFormValue({ location: `${MOBILE_EVENT_LOCATION_CURRENT_VALUE_PREFIX}（${latitude}, ${longitude}）` });
        setIsLocationSheetOpen(false);
      },
      () => {
        setFormValue({ location: MOBILE_EVENT_LOCATION_CURRENT_VALUE_PREFIX });
        setIsLocationSheetOpen(false);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 },
    );
  }, [setFormValue]);

  const handleSubmit = useCallback(() => {
    if (isSubmitDisabled || !selectedCalendarOption) return;
    const eventDates = buildMobileEventDates(form);
    if (!eventDates) {
      setError("開始日時と終了日時を確認してください");
      return;
    }
    const writableEvent: GCalWritableEventInput = {
      calendarId: selectedCalendarOption.calendarId,
      title: form.title.trim(),
      startsAt: eventDates.startsAt,
      endsAt: eventDates.endsAt,
      isAllDay: eventDates.isAllDay,
    };
    const trimmedLocation = form.location.trim();
    const trimmedDescription = form.description.trim();
    if (trimmedLocation) writableEvent.location = trimmedLocation;
    if (trimmedDescription) writableEvent.description = trimmedDescription;
    if (selectedCalendarOption.projectId) writableEvent.projectId = selectedCalendarOption.projectId;

    setIsSubmitting(true);
    setError(null);
    void onCreateEvent(selectedCalendarOption.accountId, writableEvent)
      .then(() => {
        onClose(); })
      .catch((caughtError) => {
        setError(getErrorMessage(caughtError)); })
      .finally(() => {
        setIsSubmitting(false); });
  }, [form, isSubmitDisabled, onClose, onCreateEvent, selectedCalendarOption]);

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop + Sheet ── */}
      <div
        className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 backdrop-blur-[2px]"
        role="presentation"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-calendar-event-composer-title"
          className="flex h-[min(92vh,760px)] w-full max-w-96 flex-col overflow-hidden rounded-t-[20px] bg-[#f2f2f7] shadow-[0_-2px_32px_rgba(0,0,0,0.18)]"
        >
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#c6c6c8] bg-[#f2f2f7]/90 px-4 backdrop-blur-xl">
            <button
              type="button"
              className="text-base font-normal tracking-tight text-blue-500 disabled:text-[#c7c7cc] active:opacity-60 transition-opacity"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <h2
              id="mobile-calendar-event-composer-title"
              className="text-base font-semibold tracking-tight text-neutral-950"
            >
              新規イベント
            </h2>
            <button
              type="button"
              className="text-base font-semibold tracking-tight text-blue-500 disabled:text-[#c7c7cc] active:opacity-60 transition-opacity"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? "追加中…" : "追加"}
            </button>
          </header>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 space-y-5">

            {/* ── Card 1: Title & Location ── */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]">
              <input
                className="h-14 w-full border-0 border-b border-zinc-200 bg-transparent px-4 text-xl font-normal tracking-tight text-neutral-950 outline-none placeholder:text-[#c7c7cc]"
                value={form.title}
                onChange={(event) => setFormValue({ title: event.target.value })}
                placeholder="タイトル"
                inputMode="text"
              />
              <button
                type="button"
                className={cn(
                  "flex h-11 w-full items-center px-4 text-left text-base tracking-tight outline-none",
                  form.location.trim() ? "text-neutral-950" : "text-[#c7c7cc]",
                )}
                onClick={() => {
                  setActivePickerField(null); setIsLocationSheetOpen(true); }}
              >
                <span className="min-w-0 flex-1 truncate">{form.location.trim() ?? "場所またはビデオ通話"}</span>
                {form.location.trim() && (
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#c7c7cc]" />
                )}
              </button>
            </div>

            {/* ── Card 2: Date & Time ── */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]">
              {/* All-day toggle */}
              <div className="flex min-h-12 items-center justify-between border-b border-zinc-200 px-4">
                <span className="text-base tracking-tight text-neutral-950">終日</span>
                <ToggleSwitch
                  checked={form.isAllDay}
                  onChange={(checked) => {
                    setFormValue({ isAllDay: checked }); setActivePickerField(null); }}
                  aria-label="終日"
                />
              </div>

              {/* Start */}
              <div className="border-b border-zinc-200">
                <div className="flex min-h-12 items-center justify-between gap-3 px-4">
                  <span className="text-base tracking-tight text-neutral-950">開始</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <MobileCalendarDateButton
                      label="開始日"
                      value={form.startDate}
                      isActive={activePickerField === "startDate"}
                      onClick={() => setActivePickerField((current) => current === "startDate" ? null : "startDate")}
                    />
                    {!form.isAllDay && (
                      <MobileCalendarTimeButton
                        label="開始時刻"
                        value={form.startTime}
                        isActive={activePickerField === "startTime"}
                        onClick={() => setActivePickerField((current) => current === "startTime" ? null : "startTime")}
                      />
                    )}
                  </span>
                </div>
                {activePickerField === "startDate" && (
                  <MobileCalendarInlineDatePicker value={form.startDate} onChange={(startDate) => setFormValue({ startDate })} />
                )}
                {!form.isAllDay && activePickerField === "startTime" && (
                  <MobileCalendarInlineTimeWheel value={form.startTime} onChange={(startTime) => setFormValue({ startTime })} />
                )}
              </div>

              {/* End */}
              <div className="border-b border-zinc-200">
                <div className="flex min-h-12 items-center justify-between gap-3 px-4">
                  <span className="text-base tracking-tight text-neutral-950">終了</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <MobileCalendarDateButton
                      label="終了日"
                      value={form.endDate}
                      isActive={activePickerField === "endDate"}
                      onClick={() => setActivePickerField((current) => current === "endDate" ? null : "endDate")}
                    />
                    {!form.isAllDay && (
                      <MobileCalendarTimeButton
                        label="終了時刻"
                        value={form.endTime}
                        isActive={activePickerField === "endTime"}
                        onClick={() => setActivePickerField((current) => current === "endTime" ? null : "endTime")}
                      />
                    )}
                  </span>
                </div>
                {activePickerField === "endDate" && (
                  <MobileCalendarInlineDatePicker value={form.endDate} onChange={(endDate) => setFormValue({ endDate })} />
                )}
                {!form.isAllDay && activePickerField === "endTime" && (
                  <MobileCalendarInlineTimeWheel value={form.endTime} onChange={(endTime) => setFormValue({ endTime })} />
                )}
              </div>

              {/* Travel time */}
              <div className="flex min-h-12 items-center justify-between px-4">
                <span className="text-base tracking-tight text-neutral-950">移動時間</span>
                <span className="text-base tracking-tight text-zinc-500">なし</span>
              </div>
            </div>

            {/* ── Card 3: Calendar selector ── */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]">
              {calendarOptions.length > 0 ? (
                <label className="flex min-h-12 items-center justify-between gap-4 px-4">
                  <span className="text-base tracking-tight text-neutral-950">カレンダー</span>
                  <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedCalendarOption?.color ?? MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR }}
                    />
                    <select
                      className="min-w-0 max-w-2/3 bg-transparent text-right text-base tracking-tight text-zinc-500 outline-none"
                      value={form.calendarKey}
                      onChange={(event) => setFormValue({ calendarKey: event.target.value })}
                    >
                      {calendarOptions.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </span>
                </label>
              ) : (
                <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3">
                  <p className="min-w-0 text-sm leading-5 tracking-tight text-zinc-500">
                    Google カレンダーを接続すると予定を追加できます。
                  </p>
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-[#007aff] px-4 py-2 text-sm font-semibold tracking-tight text-white active:opacity-80 transition-opacity"
                    onClick={handleAddCalendar}
                  >
                    接続
                  </button>
                </div>
              )}
            </div>

            {/* ── Card 4: Memo ── */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]">
              <textarea
                className="h-36 w-full resize-none border-0 bg-transparent px-4 py-3 text-base leading-6 tracking-tight text-neutral-950 outline-none placeholder:text-[#c7c7cc]"
                value={form.description}
                onChange={(event) => setFormValue({ description: event.target.value })}
                placeholder="メモ"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="px-1 text-xs leading-5 tracking-tight text-[#ff3b30]">{error}</p>
            )}
          </div>
        </section>
      </div>

      {/* ── Location Sheet ── */}
      {isLocationSheetOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/20 backdrop-blur-[1px]"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="場所"
            className="flex h-[min(88vh,720px)] w-full max-w-96 flex-col overflow-hidden rounded-t-[13px] bg-white shadow-[0_-2px_32px_rgba(0,0,0,0.15)]"
          >
            {/* Sheet header */}
            <header className="relative flex h-14 shrink-0 items-center px-4 border-b border-zinc-200">
              <h3 className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-semibold tracking-tight text-neutral-950">
                場所
              </h3>
              <button
                type="button"
                className="ml-auto text-base font-normal tracking-tight text-blue-500 active:opacity-60 transition-opacity"
                onClick={() => setIsLocationSheetOpen(false)}
              >
                キャンセル
              </button>
            </header>

            {/* Search field */}
            <div className="px-4 pb-3 pt-3 border-b border-zinc-200">
              <label className="flex h-9 items-center rounded-xl bg-[#f2f2f7] px-3 gap-2">
                <MobileCalendarSearchIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  autoFocus
                  className="min-w-0 flex-1 border-0 bg-transparent text-base leading-none tracking-tight text-neutral-950 outline-none placeholder:text-zinc-500"
                  value={form.location}
                  onChange={(event) => setFormValue({ location: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setIsLocationSheetOpen(false); }}
                  placeholder="場所またはビデオ通話を入力"
                  inputMode="text"
                />
              </label>
            </div>

            {/* Location options */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Current location */}
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-4 border-b border-zinc-200 px-4 text-left active:bg-[#f2f2f7] transition-colors"
                onClick={handleSelectCurrentLocation}
              >
                <MobileCalendarCurrentLocationIcon className="h-9 w-9 shrink-0" />
                <span className="text-base tracking-tight text-neutral-950">現在地</span>
                <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-[#c7c7cc]" />
              </button>

              {/* Video call section */}
              <div className="border-b border-zinc-200 bg-[#f2f2f7] px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">ビデオ通話</span>
              </div>
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-4 border-b border-zinc-200 px-4 text-left active:bg-[#f2f2f7] transition-colors"
                onClick={handleSelectFaceTime}
              >
                <MobileCalendarFaceTimeIcon className="h-9 w-9 shrink-0" />
                <span className="text-base tracking-tight text-neutral-950">FaceTime</span>
                <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-[#c7c7cc]" />
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};



export { MobileCalendarEventComposer };
