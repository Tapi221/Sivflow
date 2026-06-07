import { type CSSProperties, type PointerEvent as ReactPointerEvent, type SVGProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type MobileCalendarWritableCalendarOption = { key: string; accountId: string; calendarId: string; label: string; accountLabel: string; calendarLabel: string; color: string; projectId?: string };
type MobileCalendarEventFormState = { title: string; location: string; isAllDay: boolean; startDate: string; startTime: string; endDate: string; endTime: string; calendarKey: string; description: string };
type MobileEventDates = { startsAt: Date; endsAt: Date; isAllDay: boolean };
type MobileCalendarEventComposerProps = { isOpen: boolean; selectedDate: Date; accounts: GoogleAccountDisplay[]; projectCalendarLinks: ProjectCalendarLink[]; onClose: () => void; onAddCalendar: () => void; onCreateEvent: (accountId: string, event: GCalWritableEventInput) => Promise<GoogleCalendarEvent> };

const MOBILE_EVENT_COMPOSER_DEFAULT_START_HOUR = 9;
const MOBILE_EVENT_COMPOSER_DEFAULT_DURATION_HOURS = 1;
const MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR = "#34c759";
const MOBILE_EVENT_COMPOSER_TOP_GAP = 34;
const MOBILE_EVENT_COMPOSER_DISMISS_DRAG_DISTANCE = 96;
const MOBILE_EVENT_LOCATION_CURRENT_VALUE_PREFIX = "現在地";

const isSameLocalDate = (left: Date, right: Date): boolean => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();

const getGoogleAccountLabel = (account: GoogleAccountDisplay): string => account.name?.trim() || account.email?.trim() || "Google Calendar";

const getGoogleCalendarLabel = (calendarLabel: string): string => calendarLabel.trim() || "カレンダー";

const createMobileCalendarOptionKey = (accountId: string, calendarId: string): string => JSON.stringify([accountId, calendarId]);

const findProjectIdForGoogleCalendar = (projectCalendarLinks: ProjectCalendarLink[], accountId: string, calendarId: string): string | undefined => projectCalendarLinks.find((link) => link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId)?.projectId;

const buildMobileCalendarOptions = (accounts: GoogleAccountDisplay[], projectCalendarLinks: ProjectCalendarLink[]): MobileCalendarWritableCalendarOption[] => {
  const includeAccountLabel = accounts.length > 1;
  const options = accounts.flatMap((account) => {
    const accountLabel = getGoogleAccountLabel(account);

    return account.calendars.map((calendar) => {
      const calendarLabel = getGoogleCalendarLabel(calendar.summaryOverride ?? calendar.summary ?? "");
      const key = createMobileCalendarOptionKey(account.accountId, calendar.id);
      const label = includeAccountLabel ? `${calendarLabel}（${accountLabel}）` : calendarLabel;

      return { key, accountId: account.accountId, calendarId: calendar.id, label, accountLabel, calendarLabel, color: calendar.backgroundColor ?? MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR, projectId: findProjectIdForGoogleCalendar(projectCalendarLinks, account.accountId, calendar.id) };
    });
  });

  return options;
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

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : "予定の作成に失敗しました。";

const isInteractiveComposerSwipeTarget = (target: EventTarget | null): boolean => target instanceof HTMLElement && Boolean(target.closest("button,input,select,textarea,a"));

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
  <svg viewBox="0 0 600 600" xmlSpace="preserve" aria-hidden="true" {...props}>
    <linearGradient id="mobile-calendar-facetime-icon-gradient" x1="-137.5424" x2="-133.9618" y1="785.878" y2="197.7213" gradientTransform="matrix(1 0 0 -1 435.7924 798.4074)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#5df777" />
      <stop offset="1" stopColor="#0abc28" />
    </linearGradient>
    <path fill="url(#mobile-calendar-facetime-icon-gradient)" d="M137.7 0h324.6C538.6 0 600 61.4 600 137.7v324.6c0 76.3-61.4 137.7-137.7 137.7H137.7C61.4 600 0 538.6 0 462.3V137.7C0 61.4 61.4 0 137.7 0z" />
    <path fill="#fff" d="M91.5 227.3v146.1c0 31.9 25.9 57.7 57.7 57.7H325c31.9 0 57.7-25.9 57.7-57.7V227.3c0-31.9-25.9-57.7-57.7-57.7H149.3c-31.9-.1-57.8 25.8-57.8 57.7zm379.3-39.1-66.2 54.6c-5.9 4.9-9.3 12.1-9.3 19.7v75.6c0 7.6 3.3 14.7 9.1 19.6l66.2 55.6c15.1 12.6 38 1.9 38-17.7V206c.1-19.5-22.7-30.3-37.8-17.8z" />
  </svg>
);

const MobileCalendarEventComposer = ({ isOpen, selectedDate, accounts, projectCalendarLinks, onClose, onAddCalendar, onCreateEvent }: MobileCalendarEventComposerProps) => {
  const calendarOptions = useMemo(() => buildMobileCalendarOptions(accounts, projectCalendarLinks), [accounts, projectCalendarLinks]);
  const [form, setForm] = useState<MobileCalendarEventFormState>(() => createInitialEventFormState(selectedDate, calendarOptions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const selectedCalendarOption = useMemo(() => calendarOptions.find((option) => option.key === form.calendarKey) ?? null, [calendarOptions, form.calendarKey]);
  const isSubmitDisabled = isSubmitting || !form.title.trim() || !selectedCalendarOption;
  const sheetStyle = useMemo<CSSProperties>(() => ({ transform: `translateY(${dragOffset}px)`, transition: dragStartYRef.current === null ? "transform 180ms ease-out" : "none" }), [dragOffset]);

  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setErrorMessage(null);
      setIsSubmitting(false);
      setIsLocationSheetOpen(false);
      return;
    }

    setForm(createInitialEventFormState(selectedDate, calendarOptions));
  }, [calendarOptions, isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (isLocationSheetOpen) {
        setIsLocationSheetOpen(false);
        return;
      }

      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocationSheetOpen, isOpen, onClose]);

  const setFormValue = useCallback((patch: Partial<MobileCalendarEventFormState>) => {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
    setErrorMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;

    onClose();
  }, [isSubmitting, onClose]);

  const handleAddCalendar = useCallback(() => {
    onAddCalendar();
  }, [onAddCalendar]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (isSubmitting || isInteractiveComposerSwipeTarget(event.target)) return;

    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [isSubmitting]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (dragStartYRef.current === null) return;

    setDragOffset(Math.max(0, event.clientY - dragStartYRef.current));
  }, []);

  const resetDragState = useCallback(() => {
    dragStartYRef.current = null;
    setDragOffset(0);
  }, []);

  const handlePointerEnd = useCallback(() => {
    if (dragStartYRef.current === null) return;

    if (dragOffset >= MOBILE_EVENT_COMPOSER_DISMISS_DRAG_DISTANCE) {
      resetDragState();
      handleClose();
      return;
    }

    resetDragState();
  }, [dragOffset, handleClose, resetDragState]);

  const handleSelectFaceTime = useCallback(() => {
    setFormValue({ location: "FaceTime" });
    setIsLocationSheetOpen(false);
  }, [setFormValue]);

  const handleSelectCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
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

  const handleSubmit = useCallback(async () => {
    if (!selectedCalendarOption) {
      setErrorMessage("予定を追加するカレンダーを選択してください。");
      return;
    }

    const title = form.title.trim();
    if (!title) {
      setErrorMessage("タイトルを入力してください。");
      return;
    }

    const eventDates = buildMobileEventDates(form);
    if (!eventDates) {
      setErrorMessage("開始日時と終了日時を確認してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const writableEvent: GCalWritableEventInput = { calendarId: selectedCalendarOption.calendarId, title, startsAt: eventDates.startsAt, endsAt: eventDates.endsAt, isAllDay: eventDates.isAllDay };
      const trimmedLocation = form.location.trim();
      const trimmedDescription = form.description.trim();
      if (trimmedLocation) writableEvent.location = trimmedLocation;
      if (trimmedDescription) writableEvent.description = trimmedDescription;
      if (selectedCalendarOption.projectId) writableEvent.projectId = selectedCalendarOption.projectId;

      await onCreateEvent(selectedCalendarOption.accountId, writableEvent);
      onClose();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onClose, onCreateEvent, selectedCalendarOption]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] flex justify-center bg-black/25" role="presentation" style={{ top: MOBILE_EVENT_COMPOSER_TOP_GAP }}>
      <section role="dialog" aria-modal="true" aria-labelledby="mobile-calendar-event-composer-title" className="flex h-full w-full max-w-[720px] flex-col overflow-hidden rounded-t-[26px] border border-[#d8e0ec] bg-[#f2f2f7] shadow-[0_-12px_40px_rgba(33,43,61,0.20)]" style={sheetStyle}>
        <header className="relative flex h-[58px] shrink-0 touch-none items-center bg-[#f2f2f7] px-4" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd}>
          <button type="button" className="relative z-10 mr-auto min-w-[88px] text-left text-[17px] font-normal tracking-[-0.03em] text-[#ff3b30] disabled:text-[#c7c7cc]" onClick={handleClose} disabled={isSubmitting}>キャンセル</button>
          <h2 id="mobile-calendar-event-composer-title" className="pointer-events-none absolute left-1/2 top-1/2 w-[180px] -translate-x-1/2 -translate-y-1/2 text-center text-[17px] font-bold tracking-[-0.03em] text-[#111111]">新規イベント</h2>
          <button type="button" className="relative z-10 ml-auto min-w-[88px] text-right text-[17px] font-semibold tracking-[-0.03em] text-[#ff3b30] disabled:text-[#c7c7cc]" onClick={() => { void handleSubmit(); }} disabled={isSubmitDisabled}>{isSubmitting ? "追加中" : "追加"}</button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
          {calendarOptions.length === 0 ? (
            <div className="overflow-hidden rounded-[14px] bg-white px-4 py-5 text-center">
              <p className="text-[15px] font-medium tracking-[-0.03em] text-[#111111]">書き込み可能な Google カレンダーがありません。</p>
              <button type="button" className="mt-4 rounded-full bg-[#f2f2f7] px-4 py-2 text-[15px] font-semibold tracking-[-0.03em] text-[#ff3b30]" onClick={handleAddCalendar}>Google カレンダーを追加</button>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-[14px] bg-white">
                <input className="h-[56px] w-full border-0 border-b border-[#d1d1d6] bg-transparent px-4 text-[21px] font-normal tracking-[-0.03em] text-[#111111] outline-none placeholder:text-[#c7c7cc]" value={form.title} onChange={(event) => setFormValue({ title: event.target.value })} placeholder="タイトル" inputMode="text" />
                <button type="button" className={cn("flex h-[48px] w-full items-center px-4 text-left text-[17px] tracking-[-0.03em] outline-none", form.location.trim() ? "text-[#111111]" : "text-[#c7c7cc]")} onClick={() => setIsLocationSheetOpen(true)}>
                  <span className="min-w-0 flex-1 truncate">{form.location.trim() || "場所またはビデオ通話"}</span>
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
                <div className="flex min-h-[52px] items-center justify-between border-b border-[#d1d1d6] px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">終日</span>
                  <button type="button" role="switch" aria-checked={form.isAllDay} aria-label="終日" className={cn("relative h-[31px] w-[51px] shrink-0 overflow-hidden rounded-full border-0 p-0 transition appearance-none", form.isAllDay ? "bg-[#34c759]" : "bg-[#e9e9eb]")} onClick={() => setFormValue({ isAllDay: !form.isAllDay })}>
                    <span className={cn("absolute left-0 top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.22)] transition-transform", form.isAllDay ? "translate-x-[22px]" : "translate-x-[2px]")} />
                  </button>
                </div>
                <label className="flex min-h-[52px] items-center justify-between gap-3 border-b border-[#d1d1d6] px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">開始</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <input type="date" className="h-9 rounded-[10px] bg-[#f2f2f7] px-2 text-right text-[17px] tracking-[-0.03em] text-[#111111] outline-none" value={form.startDate} onChange={(event) => setFormValue({ startDate: event.target.value })} />
                    {!form.isAllDay && <input type="time" className="h-9 w-[92px] rounded-[10px] bg-[#f2f2f7] px-2 text-right text-[17px] tracking-[-0.03em] text-[#111111] outline-none" value={form.startTime} onChange={(event) => setFormValue({ startTime: event.target.value })} />}
                  </span>
                </label>
                <label className="flex min-h-[52px] items-center justify-between gap-3 border-b border-[#d1d1d6] px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">終了</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <input type="date" className="h-9 rounded-[10px] bg-[#f2f2f7] px-2 text-right text-[17px] tracking-[-0.03em] text-[#111111] outline-none" value={form.endDate} onChange={(event) => setFormValue({ endDate: event.target.value })} />
                    {!form.isAllDay && <input type="time" className="h-9 w-[92px] rounded-[10px] bg-[#f2f2f7] px-2 text-right text-[17px] tracking-[-0.03em] text-[#111111] outline-none" value={form.endTime} onChange={(event) => setFormValue({ endTime: event.target.value })} />}
                  </span>
                </label>
                <div className="flex min-h-[52px] items-center justify-between px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">移動時間</span>
                  <span className="text-[17px] tracking-[-0.03em] text-[#8e8e93]">なし⌄</span>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
                <label className="flex min-h-[52px] items-center justify-between gap-4 border-b border-[#d1d1d6] px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">繰り返し</span>
                  <span className="text-[17px] tracking-[-0.03em] text-[#8e8e93]">しない⌄</span>
                </label>
              </div>

              <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
                <label className="flex min-h-[52px] items-center justify-between gap-4 border-b border-[#d1d1d6] px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">カレンダー</span>
                  <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selectedCalendarOption?.color ?? MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR }} />
                    <select className="min-w-0 max-w-[70%] bg-transparent text-right text-[17px] tracking-[-0.03em] text-[#8e8e93] outline-none" value={form.calendarKey} onChange={(event) => setFormValue({ calendarKey: event.target.value })}>
                      {calendarOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                  </span>
                </label>
                <div className="flex min-h-[52px] items-center justify-between gap-4 px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">予定出席者</span>
                  <span className="text-[17px] tracking-[-0.03em] text-[#8e8e93]">なし ›</span>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
                <div className="flex min-h-[52px] items-center justify-between gap-4 px-4">
                  <span className="text-[17px] tracking-[-0.03em] text-[#111111]">通知</span>
                  <span className="text-[17px] tracking-[-0.03em] text-[#8e8e93]">なし⌄</span>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
                <textarea className="h-[132px] w-full resize-none border-0 bg-transparent px-4 py-3 text-[17px] leading-6 tracking-[-0.03em] text-[#111111] outline-none placeholder:text-[#c7c7cc]" value={form.description} onChange={(event) => setFormValue({ description: event.target.value })} placeholder="メモ" />
              </div>

              <div className="mt-5 overflow-hidden rounded-[14px] bg-white">
                <button type="button" className="flex min-h-[52px] w-full items-center px-4 text-left text-[17px] tracking-[-0.03em] text-[#111111]">添付ファイルを追加...</button>
              </div>
            </>
          )}

          {errorMessage ? <p className="mt-3 px-1 text-[14px] leading-5 tracking-[-0.03em] text-[#d94a56]">{errorMessage}</p> : null}
        </div>
      </section>

      {isLocationSheetOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center bg-black/10" role="presentation" style={{ top: MOBILE_EVENT_COMPOSER_TOP_GAP + 18 }}>
          <section role="dialog" aria-modal="true" aria-label="場所" className="flex h-full w-full max-w-[720px] flex-col overflow-hidden rounded-t-[18px] bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)]">
            <header className="relative flex h-[76px] shrink-0 items-center px-[30px]">
              <h3 className="pointer-events-none absolute left-1/2 top-1/2 w-[180px] -translate-x-1/2 -translate-y-1/2 text-center text-[21px] font-bold tracking-[-0.03em] text-[#111111]">場所</h3>
              <button type="button" className="ml-auto min-w-[92px] text-right text-[20px] font-normal tracking-[-0.03em] text-[#ff3b30]" onClick={() => setIsLocationSheetOpen(false)}>キャンセル</button>
            </header>

            <div className="px-[30px] pb-[28px]">
              <label className="flex h-[68px] items-center rounded-[13px] bg-[#f1f1f3] px-[13px]">
                <MobileCalendarSearchIcon className="mr-[10px] h-[33px] w-[33px] shrink-0 text-[#8e8e93]" />
                <input autoFocus className="min-w-0 flex-1 border-0 bg-transparent text-[26px] tracking-[-0.04em] text-[#111111] outline-none placeholder:text-[#8e8e93]" value={form.location} onChange={(event) => setFormValue({ location: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") setIsLocationSheetOpen(false); }} placeholder="場所またはビデオ通話を入力" inputMode="text" />
              </label>
            </div>

            <div className="h-px bg-[#d1d1d6]" />

            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              <button type="button" className="flex min-h-[106px] w-full items-center gap-[20px] border-b border-[#d1d1d6] px-[30px] text-left" onClick={handleSelectCurrentLocation}>
                <MobileCalendarCurrentLocationIcon className="h-[56px] w-[56px] shrink-0" />
                <span className="text-[30px] tracking-[-0.04em] text-[#111111]">現在地</span>
              </button>

              <div className="border-b border-[#d1d1d6] bg-[#fafafa] px-[30px] pb-[13px] pt-[55px]">
                <span className="text-[26px] font-bold tracking-[-0.04em] text-[#8e8e93]">ビデオ通話</span>
              </div>

              <button type="button" className="flex min-h-[123px] w-full items-center gap-[20px] border-b border-[#d1d1d6] px-[30px] text-left" onClick={handleSelectFaceTime}>
                <MobileCalendarFaceTimeIcon className="h-[66px] w-[66px] shrink-0" />
                <span className="text-[30px] tracking-[-0.04em] text-[#111111]">FaceTime</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export { MobileCalendarEventComposer };