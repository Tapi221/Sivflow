import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import type { CalendarRecurrenceFrequency, CalendarRecurrenceRule, CalendarWeekday } from "@core/calendar";
import type { GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type RecurrencePreset = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom";

type MobileCalendarEventComposerProps = {
  isOpen: boolean;
  selectedDate?: Date;
  googleAccounts?: GoogleAccountDisplay[];
  onCreateEvent?: (accountId: string, event: GCalWritableEventInput) => Promise<GoogleCalendarEvent>;
  onClose?: () => void;
};

const RECURRENCE_OPTIONS: readonly { value: RecurrencePreset; label: string }[] = [
  { value: "none", label: "しない" },
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "biweekly", label: "隔週" },
  { value: "monthly", label: "毎月" },
  { value: "yearly", label: "毎年" },
  { value: "custom", label: "カスタム" },
];

const CUSTOM_FREQUENCY_OPTIONS: readonly { value: CalendarRecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "日" },
  { value: "weekly", label: "週" },
  { value: "monthly", label: "月" },
  { value: "yearly", label: "年" },
];

const EMPTY_ACCOUNTS: GoogleAccountDisplay[] = [];
const DEFAULT_TITLE = "無題";
const FORM_ROW_CLASS_NAME = "flex min-h-[48px] items-center gap-3 border-b border-[#e5e5ea] px-4";
const FORM_LABEL_CLASS_NAME = "w-[92px] shrink-0 text-[15px] font-medium text-[#1c1c1e]";
const FORM_INPUT_CLASS_NAME = "min-w-0 flex-1 rounded-[8px] border-0 bg-[#f2f2f7] px-3 py-2 text-[15px] text-[#1c1c1e] outline-none ring-0 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/25";
const FORM_SELECT_CLASS_NAME = `${FORM_INPUT_CLASS_NAME} cursor-pointer appearance-auto`;
const FORM_TEXTAREA_CLASS_NAME = `${FORM_INPUT_CLASS_NAME} min-h-[76px] resize-none`;
const ACTION_BUTTON_CLASS_NAME = "rounded-[9px] px-3 py-2 text-[15px] font-semibold text-[#ff3b30] transition hover:bg-[#ff3b30]/10";
const ADD_BUTTON_CLASS_NAME = "rounded-[9px] px-3 py-2 text-[15px] font-semibold text-[#ff3b30] transition hover:bg-[#ff3b30]/10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent";

const isValidDate = (date: Date): boolean => Number.isFinite(date.getTime());

const createDefaultStartDate = (selectedDate: Date): Date => addHours(startOfDay(selectedDate), 9);

const toDateInputValue = (date: Date): string => format(date, "yyyy-MM-dd");

const toTimeInputValue = (date: Date): string => format(date, "HH:mm");

const createDateFromInputs = (dateValue: string, timeValue: string): Date => {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
};

const createEndOfDateInputValue = (dateValue: string): Date => {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Date(year, month - 1, day, 23, 59, 59, 999);
};

const getDefaultCalendarId = (account: GoogleAccountDisplay | undefined): string =>
  account?.calendars.find((calendar) => calendar.primary || calendar.selected)?.id ?? account?.calendars[0]?.id ?? "";

const getRecurrenceAnchorFields = (frequency: CalendarRecurrenceFrequency, startsAt: Date): Pick<CalendarRecurrenceRule, "daysOfMonth" | "daysOfWeek" | "monthsOfYear"> => {
  if (frequency === "weekly") return { daysOfWeek: [startsAt.getDay() as CalendarWeekday] };
  if (frequency === "monthly") return { daysOfMonth: [startsAt.getDate()] };
  if (frequency === "yearly") return { daysOfMonth: [startsAt.getDate()], monthsOfYear: [startsAt.getMonth() + 1] };

  return {};
};

const buildPresetRecurrenceRule = (preset: RecurrencePreset, startsAt: Date): CalendarRecurrenceRule | undefined => {
  if (preset === "none" || preset === "custom") return undefined;

  const frequency: CalendarRecurrenceFrequency = preset === "biweekly" ? "weekly" : preset;

  return {
    frequency,
    interval: preset === "biweekly" ? 2 : undefined,
    ...getRecurrenceAnchorFields(frequency, startsAt),
  };
};

const buildCustomRecurrenceRule = ({ customFrequency, customInterval, customUntilDate, startsAt }: { customFrequency: CalendarRecurrenceFrequency; customInterval: number; customUntilDate: string; startsAt: Date }): CalendarRecurrenceRule => ({
  frequency: customFrequency,
  interval: Math.max(1, Math.floor(customInterval)),
  endDate: customUntilDate ? createEndOfDateInputValue(customUntilDate) : undefined,
  ...getRecurrenceAnchorFields(customFrequency, startsAt),
});

const MobileCalendarEventComposer = ({ isOpen, selectedDate = new Date(), googleAccounts = EMPTY_ACCOUNTS, onCreateEvent, onClose }: MobileCalendarEventComposerProps) => {
  const writableAccounts = useMemo(() => googleAccounts.filter((account) => account.connectionStatus === "connected" && account.calendars.length > 0), [googleAccounts]);
  const defaultAccountId = writableAccounts[0]?.accountId ?? "";
  const selectedAccount = useMemo(() => writableAccounts.find((account) => account.accountId === defaultAccountId) ?? writableAccounts[0], [defaultAccountId, writableAccounts]);
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [calendarId, setCalendarId] = useState(getDefaultCalendarId(selectedAccount));
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(toDateInputValue(createDefaultStartDate(selectedDate)));
  const [startTime, setStartTime] = useState(toTimeInputValue(createDefaultStartDate(selectedDate)));
  const [endDate, setEndDate] = useState(toDateInputValue(addHours(createDefaultStartDate(selectedDate), 1)));
  const [endTime, setEndTime] = useState(toTimeInputValue(addHours(createDefaultStartDate(selectedDate), 1)));
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>("none");
  const [customFrequency, setCustomFrequency] = useState<CalendarRecurrenceFrequency>("weekly");
  const [customInterval, setCustomInterval] = useState(1);
  const [customUntilDate, setCustomUntilDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const activeAccount = useMemo(() => writableAccounts.find((account) => account.accountId === accountId), [accountId, writableAccounts]);
  const canSubmit = Boolean(onCreateEvent && accountId && calendarId && !isSaving);

  useEffect(() => {
    if (!isOpen) return;

    const start = createDefaultStartDate(selectedDate);
    const end = addHours(start, 1);

    setTitle("");
    setLocation("");
    setDescription("");
    setIsAllDay(false);
    setStartDate(toDateInputValue(start));
    setStartTime(toTimeInputValue(start));
    setEndDate(toDateInputValue(end));
    setEndTime(toTimeInputValue(end));
    setRecurrencePreset("none");
    setCustomFrequency("weekly");
    setCustomInterval(1);
    setCustomUntilDate("");
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen || accountId) return;

    setAccountId(defaultAccountId);
  }, [accountId, defaultAccountId, isOpen]);

  useEffect(() => {
    const account = writableAccounts.find((item) => item.accountId === accountId);
    if (!account) {
      setCalendarId("");
      return;
    }

    if (!account.calendars.some((calendar) => calendar.id === calendarId)) {
      setCalendarId(getDefaultCalendarId(account));
    }
  }, [accountId, calendarId, writableAccounts]);

  const handleChangeAccount = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const nextAccountId = event.target.value;
    const nextAccount = writableAccounts.find((account) => account.accountId === nextAccountId);

    setAccountId(nextAccountId);
    setCalendarId(getDefaultCalendarId(nextAccount));
  }, [writableAccounts]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreateEvent || !accountId || !calendarId) {
      toast.error("予定を追加できません", { description: "接続済みの Google カレンダーが必要です。" });
      return;
    }

    const startsAt = createDateFromInputs(startDate, isAllDay ? "00:00" : startTime);
    const rawEndsAt = createDateFromInputs(endDate, isAllDay ? "00:00" : endTime);
    const endsAt = isAllDay ? addDays(rawEndsAt <= startsAt ? startsAt : rawEndsAt, 1) : rawEndsAt;

    if (!isValidDate(startsAt) || !isValidDate(endsAt) || startsAt >= endsAt) {
      toast.error("日時が不正です", { description: "終了日時は開始日時より後にしてください。" });
      return;
    }

    const recurrenceRule = recurrencePreset === "custom"
      ? buildCustomRecurrenceRule({ customFrequency, customInterval, customUntilDate, startsAt })
      : buildPresetRecurrenceRule(recurrencePreset, startsAt);
    const input: GCalWritableEventInput = {
      calendarId,
      title: title.trim() || DEFAULT_TITLE,
      description: description.trim() || undefined,
      endsAt,
      isAllDay,
      location: location.trim() || undefined,
      recurrenceRule,
      startsAt,
    };

    setIsSaving(true);

    try {
      await onCreateEvent(accountId, input);
      toast("予定を追加しました", { description: input.title });
      onClose?.();
    } catch (error) {
      console.warn("[MobileCalendarEventComposer] event creation failed", error);
      toast.error("予定を追加できませんでした", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSaving(false);
    }
  }, [accountId, calendarId, customFrequency, customInterval, customUntilDate, description, endDate, endTime, isAllDay, location, onClose, onCreateEvent, recurrencePreset, startDate, startTime, title]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/20 backdrop-blur-[2px]" role="presentation">
      <form className="w-full max-w-[720px] overflow-hidden rounded-t-[24px] bg-[#f2f2f7] shadow-[0_-12px_40px_rgba(0,0,0,0.18)]" role="dialog" aria-modal="true" aria-label="新規イベント" onSubmit={handleSubmit}>
        <div className="flex h-[56px] items-center justify-between border-b border-[#d1d1d6] bg-white px-4">
          <button type="button" className={ACTION_BUTTON_CLASS_NAME} onClick={onClose}>
            キャンセル
          </button>
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">新規イベント</h2>
          <button type="submit" className={ADD_BUTTON_CLASS_NAME} disabled={!canSubmit}>
            {isSaving ? "追加中" : "追加"}
          </button>
        </div>

        <div className="max-h-[min(760px,calc(100vh-72px))] overflow-y-auto px-4 py-5">
          <section className="overflow-hidden rounded-[14px] bg-white">
            <label className={FORM_ROW_CLASS_NAME}>
              <span className={FORM_LABEL_CLASS_NAME}>タイトル</span>
              <input className={FORM_INPUT_CLASS_NAME} value={title} placeholder="新規イベント" onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className={FORM_ROW_CLASS_NAME}>
              <span className={FORM_LABEL_CLASS_NAME}>場所</span>
              <input className={FORM_INPUT_CLASS_NAME} value={location} placeholder="場所またはビデオ通話" onChange={(event) => setLocation(event.target.value)} />
            </label>
          </section>

          <section className="mt-5 overflow-hidden rounded-[14px] bg-white">
            <label className={FORM_ROW_CLASS_NAME}>
              <span className={FORM_LABEL_CLASS_NAME}>終日</span>
              <input type="checkbox" className="ml-auto h-5 w-5 accent-[#34c759]" checked={isAllDay} onChange={(event) => setIsAllDay(event.target.checked)} />
            </label>
            <div className={FORM_ROW_CLASS_NAME}>
              <span className={FORM_LABEL_CLASS_NAME}>開始</span>
              <input className={FORM_INPUT_CLASS_NAME} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              {!isAllDay && <input className="w-[116px] rounded-[8px] border-0 bg-[#f2f2f7] px-3 py-2 text-[15px] text-[#1c1c1e] outline-none ring-0 focus:bg-white focus:ring-2 focus:ring-[#007aff]/25" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />}
            </div>
            <div className={FORM_ROW_CLASS_NAME}>
              <span className={FORM_LABEL_CLASS_NAME}>終了</span>
              <input className={FORM_INPUT_CLASS_NAME} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              {!isAllDay && <input className="w-[116px] rounded-[8px] border-0 bg-[#f2f2f7] px-3 py-2 text-[15px] text-[#1c1c1e] outline-none ring-0 focus:bg-white focus:ring-2 focus:ring-[#007aff]/25" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />}
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-[14px] bg-white">
            <label className={FORM_ROW_CLASS_NAME}>
              <span className={FORM_LABEL_CLASS_NAME}>繰り返し</span>
              <select className={FORM_SELECT_CLASS_NAME} value={recurrencePreset} onChange={(event) => setRecurrencePreset(event.target.value as RecurrencePreset)}>
                {RECURRENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {recurrencePreset === "custom" && (
              <>
                <label className={FORM_ROW_CLASS_NAME}>
                  <span className={FORM_LABEL_CLASS_NAME}>間隔</span>
                  <input className="w-[92px] rounded-[8px] border-0 bg-[#f2f2f7] px-3 py-2 text-[15px] text-[#1c1c1e] outline-none ring-0 focus:bg-white focus:ring-2 focus:ring-[#007aff]/25" min={1} type="number" value={customInterval} onChange={(event) => setCustomInterval(Number(event.target.value))} />
                  <select className={FORM_SELECT_CLASS_NAME} value={customFrequency} onChange={(event) => setCustomFrequency(event.target.value as CalendarRecurrenceFrequency)}>
                    {CUSTOM_FREQUENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}ごと</option>)}
                  </select>
                </label>
                <label className={FORM_ROW_CLASS_NAME}>
                  <span className={FORM_LABEL_CLASS_NAME}>終了日</span>
                  <input className={FORM_INPUT_CLASS_NAME} type="date" value={customUntilDate} onChange={(event) => setCustomUntilDate(event.target.value)} />
                </label>
              </>
            )}
          </section>

          <section className="mt-5 overflow-hidden rounded-[14px] bg-white">
            <label className={FORM_ROW_CLASS_NAME}>
              <span className={FORM_LABEL_CLASS_NAME}>アカウント</span>
              <select className={FORM_SELECT_CLASS_NAME} value={accountId} onChange={handleChangeAccount}>
                {writableAccounts.length === 0 ? <option value="">Google カレンダー未接続</option> : writableAccounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.email ?? account.name ?? "Google"}</option>)}
              </select>
            </label>
            <label className={FORM_ROW_CLASS_NAME}>
              <span className={FORM_LABEL_CLASS_NAME}>カレンダー</span>
              <select className={FORM_SELECT_CLASS_NAME} value={calendarId} onChange={(event) => setCalendarId(event.target.value)} disabled={!activeAccount}>
                {activeAccount?.calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.summaryOverride ?? calendar.summary}</option>) ?? <option value="">選択できません</option>}
              </select>
            </label>
          </section>

          <section className="mt-5 overflow-hidden rounded-[14px] bg-white">
            <label className="flex flex-col gap-2 px-4 py-3">
              <span className={FORM_LABEL_CLASS_NAME}>メモ</span>
              <textarea className={FORM_TEXTAREA_CLASS_NAME} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </section>
        </div>
      </form>
    </div>
  );
};

export { MobileCalendarEventComposer };
