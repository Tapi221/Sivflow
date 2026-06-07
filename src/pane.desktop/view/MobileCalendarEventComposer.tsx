import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type MobileCalendarWritableCalendarOption = {
  key: string;
  accountId: string;
  calendarId: string;
  label: string;
  accountLabel: string;
  calendarLabel: string;
  color: string;
  projectId?: string;
};

type MobileCalendarEventFormState = {
  title: string;
  location: string;
  isAllDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  calendarKey: string;
  description: string;
};

type MobileEventDates = {
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
};

type MobileCalendarEventComposerProps = {
  isOpen: boolean;
  selectedDate: Date;
  accounts: GoogleAccountDisplay[];
  projectCalendarLinks: ProjectCalendarLink[];
  onClose: () => void;
  onAddCalendar: () => Promise<void>;
  onCreateEvent: (accountId: string, event: GCalWritableEventInput) => Promise<GoogleCalendarEvent>;
};

const MOBILE_EVENT_COMPOSER_DEFAULT_START_HOUR = 9;
const MOBILE_EVENT_COMPOSER_DEFAULT_DURATION_HOURS = 1;
const MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR = "#34c759";
const MOBILE_EVENT_COMPOSER_TOP_GAP = 34;
const MOBILE_EVENT_COMPOSER_DISMISS_DRAG_DISTANCE = 96;
const MOBILE_EVENT_LOCATION_CURRENT_VALUE_PREFIX = "現在地";

const createMobileCalendarOptionKey = (accountId: string, calendarId: string): string => JSON.stringify([accountId, calendarId]);

const formatEventDateInput = (value: Date): string => format(value, "yyyy-MM-dd");

const formatEventTimeInput = (value: Date): string => format(value, "HH:mm");

const buildMobileCalendarOptions = (accounts: GoogleAccountDisplay[], projectCalendarLinks: ProjectCalendarLink[]): MobileCalendarWritableCalendarOption[] => {
  const projectLinkByCalendarKey = new Map<string, ProjectCalendarLink>();

  projectCalendarLinks.forEach((link) => {
    projectLinkByCalendarKey.set(createMobileCalendarOptionKey(link.accountId, link.externalCalendarId), link);
  });

  return accounts.flatMap((account) => account.calendars.map((calendar) => {
    const key = createMobileCalendarOptionKey(account.accountId, calendar.id);
    const linkedProject = projectLinkByCalendarKey.get(key);

    return {
      key,
      accountId: account.accountId,
      calendarId: calendar.id,
      label: linkedProject?.externalCalendarName?.trim() || calendar.summary?.trim() || "カレンダー",
      accountLabel: account.name?.trim() || account.email?.trim() || "Google Calendar",
      calendarLabel: calendar.summary?.trim() || "カレンダー",
      color: calendar.backgroundColor ?? MOBILE_EVENT_COMPOSER_FALLBACK_CALENDAR_COLOR,
      projectId: linkedProject?.projectId,
    };
  }));
};

const buildMobileEventDates = (form: MobileCalendarEventFormState): MobileEventDates | null => {
  const startDate = new Date(`${form.startDate}T${form.isAllDay ? "00:00" : form.startTime || "00:00"}:00`);
  const endDate = new Date(`${form.endDate}T${form.isAllDay ? "00:00" : form.endTime || "00:00"}:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  if (form.isAllDay) {
    const startsAt = startOfDay(startDate);
    const inclusiveEndDate = startOfDay(endDate);
    const normalizedEndDate = inclusiveEndDate.getTime() >= startsAt.getTime() ? inclusiveEndDate : startsAt;

    return {
      startsAt,
      endsAt: addDays(normalizedEndDate, 1),
      isAllDay: true,
    };
  }

  const startsAt = startDate;
  const endsAt = endDate.getTime() > startDate.getTime() ? endDate : addHours(startDate, MOBILE_EVENT_COMPOSER_DEFAULT_DURATION_HOURS);

  return {
    startsAt,
    endsAt,
    isAllDay: false,
  };
};

const createInitialEventFormState = (selectedDate: Date, calendarOptions: MobileCalendarWritableCalendarOption[]): MobileCalendarEventFormState => {
  const startsAt = addHours(startOfDay(selectedDate), MOBILE_EVENT_COMPOSER_DEFAULT_START_HOUR);
  const endsAt = addHours(startsAt, MOBILE_EVENT_COMPOSER_DEFAULT_DURATION_HOURS);

  return {
    title: "",
    location: "",
    isAllDay: false,
    startDate: formatEventDateInput(startsAt),
    startTime: formatEventTimeInput(startsAt),
    endDate: formatEventDateInput(endsAt),
    endTime: formatEventTimeInput(endsAt),
    calendarKey: calendarOptions[0]?.key ?? "",
    description: "",
  };
};

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : "予定の作成に失敗しました。";

const isInteractiveComposerSwipeTarget = (target: EventTarget | null): boolean => target instanceof HTMLElement && Boolean(target.closest("button,input,select,textarea,a"));

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
    void onAddCalendar().catch((error) => {
      setErrorMessage(getErrorMessage(error));
    });
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

  const handleOpenLocationSheet = useCallback(() => {
    setIsLocationSheetOpen(true);
  }, []);

  const handleCloseLocationSheet = useCallback(() => {
    setIsLocationSheetOpen(false);
  }, []);

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
      const writableEvent: GCalWritableEventInput = {
        calendarId: selectedCalendarOption.calendarId,
        title,
        startsAt: eventDates.startsAt,
        endsAt: eventDates.endsAt,
        isAllDay: eventDates.isAllDay,
      };

      const trimmedLocation = form.location.trim();
      const trimmedDescription = form.description.trim();
      if (trimmedLocation) writableEvent.location = trimmedLocation;
      if (trimmedDescription) writableEvent.description = trimmedDescription;
      if (selectedCalendarOption.projectId) writableEvent.projectId = selectedCalendarOption.projectId;

      await onCreateEvent(selectedCalendarOption.accountId, writableEvent);
      onClose();
    } catch (error) {
      console.warn("[MobileCalendarEventComposer] Failed to create event", error);
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
                <button type="button" className={cn("flex h-[48px] w-full items-center px-4 text-left text-[17px] tracking-[-0.03em] outline-none", form.location.trim() ? "text-[#111111]" : "text-[#c7c7cc]")} onClick={handleOpenLocationSheet}>
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
            <header className="relative flex h-[72px] shrink-0 items-center px-4">
              <h3 className="pointer-events-none absolute left-1/2 top-1/2 w-[180px] -translate-x-1/2 -translate-y-1/2 text-center text-[19px] font-bold tracking-[-0.03em] text-[#111111]">場所</h3>
              <button type="button" className="ml-auto min-w-[88px] text-right text-[17px] font-normal tracking-[-0.03em] text-[#ff3b30]" onClick={handleCloseLocationSheet}>キャンセル</button>
            </header>

            <div className="px-4 pb-3">
              <label className="flex h-[44px] items-center rounded-[12px] bg-[#f2f2f7] px-3">
                <span aria-hidden="true" className="mr-2 text-[22px] leading-none text-[#8e8e93]">⌕</span>
                <input autoFocus className="min-w-0 flex-1 border-0 bg-transparent text-[17px] tracking-[-0.03em] text-[#111111] outline-none placeholder:text-[#8e8e93]" value={form.location} onChange={(event) => setFormValue({ location: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") setIsLocationSheetOpen(false); }} placeholder="場所またはビデオ通話を入力" inputMode="text" />
              </label>
            </div>

            <div className="h-px bg-[#d1d1d6]" />

            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              <button type="button" className="flex min-h-[72px] w-full items-center gap-4 border-b border-[#d1d1d6] px-4 text-left" onClick={handleSelectCurrentLocation}>
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#d8d8dd] text-[24px] text-[#007aff]">➤</span>
                <span className="text-[18px] tracking-[-0.03em] text-[#111111]">現在地</span>
              </button>

              <div className="border-b border-[#d1d1d6] bg-[#f7f7f7] px-4 pb-3 pt-7">
                <span className="text-[16px] font-bold tracking-[-0.03em] text-[#8e8e93]">ビデオ通話</span>
              </div>

              <button type="button" className="flex min-h-[72px] w-full items-center gap-4 border-b border-[#d1d1d6] px-4 text-left" onClick={handleSelectFaceTime}>
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] bg-[#30d158] text-[22px] text-white">▰</span>
                <span className="text-[18px] tracking-[-0.03em] text-[#111111]">FaceTime</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export { MobileCalendarEventComposer };