import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
<<<<<<< HEAD
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

const SHEET_CLOSE_THRESHOLD_PX = 120;

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
      label: linkedProject?.externalCalendarName?.trim() || calendar.summary?.trim() || "Untitled calendar",
      accountLabel: account.name?.trim() || account.email?.trim() || "Google Calendar",
      calendarLabel: calendar.summary?.trim() || "Untitled calendar",
      color: calendar.backgroundColor ?? "#185FA5",
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
  const endsAt = endDate.getTime() > startDate.getTime() ? endDate : addHours(startDate, 1);

  return {
    startsAt,
    endsAt,
    isAllDay: false,
  };
};

const createInitialEventFormState = (selectedDate: Date, calendarOptions: MobileCalendarWritableCalendarOption[]): MobileCalendarEventFormState => {
  const startsAt = addHours(startOfDay(selectedDate), 9);
  const endsAt = addHours(startsAt, 1);

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

const MobileCalendarEventComposer = ({ isOpen, selectedDate, accounts, projectCalendarLinks, onClose, onAddCalendar, onCreateEvent }: MobileCalendarEventComposerProps) => {
  const calendarOptions = useMemo(() => buildMobileCalendarOptions(accounts, projectCalendarLinks), [accounts, projectCalendarLinks]);
  const [form, setForm] = useState<MobileCalendarEventFormState>(() => createInitialEventFormState(selectedDate, calendarOptions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setErrorMessage(null);
      setIsSubmitting(false);
      return;
    }

    setForm(createInitialEventFormState(selectedDate, calendarOptions));
  }, [calendarOptions, isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const selectedCalendarOption = useMemo(() => calendarOptions.find((option) => option.key === form.calendarKey) ?? null, [calendarOptions, form.calendarKey]);
  const sheetStyle = useMemo<CSSProperties>(() => ({
    transform: `translateY(${dragOffset}px)`,
    transition: dragStartYRef.current === null ? "transform 180ms ease-out" : "none",
  }), [dragOffset]);

  const setFormValue = useCallback((patch: Partial<MobileCalendarEventFormState>) => {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;

    setDragOffset(Math.max(0, event.clientY - dragStartYRef.current));
  }, []);

  const resetDragState = useCallback(() => {
    dragStartYRef.current = null;
    setDragOffset(0);
  }, []);

  const handlePointerEnd = useCallback(() => {
    if (dragOffset >= SHEET_CLOSE_THRESHOLD_PX) {
      resetDragState();
      onClose();
      return;
    }

    resetDragState();
  }, [dragOffset, onClose, resetDragState]);

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
      await onCreateEvent(selectedCalendarOption.accountId, {
        calendarId: selectedCalendarOption.calendarId,
        title,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        startsAt: eventDates.startsAt,
        endsAt: eventDates.endsAt,
        isAllDay: eventDates.isAllDay,
        projectId: selectedCalendarOption.projectId,
      });

      onClose();
    } catch (error) {
      console.warn("[MobileCalendarEventComposer] Failed to create event", error);
      setErrorMessage("予定の作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onClose, onCreateEvent, selectedCalendarOption]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 px-0 pb-0 pt-10" aria-hidden={!isOpen}>
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="予定作成を閉じる" />
      <section role="dialog" aria-modal="true" aria-labelledby="mobile-calendar-event-composer-title" className="relative flex h-full max-h-[92dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[26px] border border-[#d8e0ec] bg-[#eef2f7] shadow-[0_-12px_40px_rgba(33,43,61,0.20)]" style={sheetStyle}>
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1.5 w-12 rounded-full bg-[#cad3df]" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} />
        </div>
        <header className="flex items-center justify-between border-b border-[#d8e0ec] px-5 pb-4 pt-1">
          <div>
            <h2 id="mobile-calendar-event-composer-title" className="text-[18px] font-semibold tracking-[-0.02em] text-[#1c1c1e]">新規予定</h2>
            <p className="mt-1 text-[12px] text-[#6e6e73]">{format(selectedDate, "yyyy年M月d日")}</p>
          </div>
          <button type="button" className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#6e6e73] transition hover:bg-white/70 hover:text-[#1c1c1e]" onClick={onClose}>閉じる</button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {calendarOptions.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#ccd6e2] bg-white/70 p-5 text-center">
              <p className="text-[14px] font-medium text-[#1c1c1e]">書き込み可能な Google カレンダーがありません。</p>
              <button type="button" className="mt-4 rounded-full bg-[#1c1c1e] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2c2c2e]" onClick={() => { void onAddCalendar(); }}>Google カレンダーを追加</button>
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#6e6e73]">タイトル</span>
                <input value={form.title} onChange={(event) => setFormValue({ title: event.target.value })} placeholder="予定名" className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-4 text-[15px] text-[#1c1c1e] outline-none transition focus:border-[#9db5d1]" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#6e6e73]">カレンダー</span>
                <select value={form.calendarKey} onChange={(event) => setFormValue({ calendarKey: event.target.value })} className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-4 text-[15px] text-[#1c1c1e] outline-none transition focus:border-[#9db5d1]">
                  {calendarOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.calendarLabel} / {option.accountLabel}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-[16px] border border-[#d8e0ec] bg-white px-4 py-3">
                <input type="checkbox" checked={form.isAllDay} onChange={(event) => setFormValue({ isAllDay: event.target.checked })} className="h-4 w-4 rounded border-[#c7d2e0]" />
                <span className="text-[14px] font-medium text-[#1c1c1e]">終日</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#6e6e73]">開始日</span>
                  <input type="date" value={form.startDate} onChange={(event) => setFormValue({ startDate: event.target.value })} className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-4 text-[15px] text-[#1c1c1e] outline-none transition focus:border-[#9db5d1]" />
                </label>
                <label className={cn("flex flex-col gap-2", form.isAllDay && "opacity-50")}>
                  <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#6e6e73]">開始時刻</span>
                  <input type="time" value={form.startTime} disabled={form.isAllDay} onChange={(event) => setFormValue({ startTime: event.target.value })} className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-4 text-[15px] text-[#1c1c1e] outline-none transition focus:border-[#9db5d1] disabled:bg-[#f3f4f6]" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#6e6e73]">終了日</span>
                  <input type="date" value={form.endDate} onChange={(event) => setFormValue({ endDate: event.target.value })} className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-4 text-[15px] text-[#1c1c1e] outline-none transition focus:border-[#9db5d1]" />
                </label>
                <label className={cn("flex flex-col gap-2", form.isAllDay && "opacity-50")}>
                  <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#6e6e73]">終了時刻</span>
                  <input type="time" value={form.endTime} disabled={form.isAllDay} onChange={(event) => setFormValue({ endTime: event.target.value })} className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-4 text-[15px] text-[#1c1c1e] outline-none transition focus:border-[#9db5d1] disabled:bg-[#f3f4f6]" />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#6e6e73]">場所</span>
                <input value={form.location} onChange={(event) => setFormValue({ location: event.target.value })} placeholder="任意" className="h-11 rounded-[14px] border border-[#d8e0ec] bg-white px-4 text-[15px] text-[#1c1c1e] outline-none transition focus:border-[#9db5d1]" />
              </label>

              <label className="flex min-h-[132px] flex-col gap-2">
                <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#6e6e73]">説明</span>
                <textarea value={form.description} onChange={(event) => setFormValue({ description: event.target.value })} placeholder="メモ" className="min-h-[132px] rounded-[14px] border border-[#d8e0ec] bg-white px-4 py-3 text-[15px] text-[#1c1c1e] outline-none transition focus:border-[#9db5d1]" />
              </label>
            </>
          )}
        </div>

        <footer className="border-t border-[#d8e0ec] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4">
          {selectedCalendarOption ? (
            <div className="mb-3 flex items-center gap-2 text-[12px] text-[#6e6e73]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedCalendarOption.color }} />
              <span>{selectedCalendarOption.calendarLabel} / {selectedCalendarOption.accountLabel}</span>
            </div>
          ) : null}
          {errorMessage ? <p className="mb-3 text-[12px] font-medium text-[#c2410c]">{errorMessage}</p> : null}
          <button type="button" disabled={isSubmitting || calendarOptions.length === 0} className="h-12 w-full rounded-[16px] bg-[#1c1c1e] text-[15px] font-semibold text-white transition hover:bg-[#2c2c2e] disabled:cursor-not-allowed disabled:bg-[#9ca3af]" onClick={() => { void handleSubmit(); }}>
            {isSubmitting ? "作成中..." : "予定を作成"}
          </button>
        </footer>
      </section>
    </div>
  );
};

export { MobileCalendarEventComposer };
=======
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcal
>>>>>>> 353deaf376ea07ae8f8b6abc73e1954561581ec3
