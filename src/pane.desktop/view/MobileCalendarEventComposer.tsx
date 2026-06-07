import { useCallback, useEffect, useMemo, useState } from "react";
import { addHours, format, startOfDay } from "date-fns";
import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MobileCalendarWritableCalendarOption = {
  key: string;
  accountId: string;
  calendarId: string;
  label: string;
  accountLabel: string;
  calendarLabel: string;
  projectId?: string;
};

type MobileCalendarEventComposerProps = {
  isOpen: boolean;
  selectedDate: Date;
  accounts: GoogleAccountDisplay[];
  projectCalendarLinks: ProjectCalendarLink[];
  onClose: () => void;
  onAddCalendar: () => void;
  onCreateEvent: (accountId: string, event: GCalWritableEventInput) => Promise<GoogleCalendarEvent>;
};

type ComposerFormState = {
  selectedKey: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
};

const buildDefaultDateRange = (selectedDate: Date) => {
  const baseStart = addHours(startOfDay(selectedDate), 9);
  const baseEnd = addHours(baseStart, 1);

  return {
    startsAt: format(baseStart, "yyyy-MM-dd'T'HH:mm"),
    endsAt: format(baseEnd, "yyyy-MM-dd'T'HH:mm"),
  };
};

const buildCalendarOptions = (accounts: GoogleAccountDisplay[], projectCalendarLinks: ProjectCalendarLink[]): MobileCalendarWritableCalendarOption[] => accounts.flatMap((account) => {
  const accountLabel = account.name?.trim() || account.email?.trim() || "Google Calendar";

  return account.calendars.map((calendar) => {
    const linkedProject = projectCalendarLinks.find((link) => link.provider === "google" && link.accountId === account.accountId && link.externalCalendarId === calendar.id);
    const calendarLabel = calendar.summaryOverride?.trim() || calendar.summary?.trim() || "無題のカレンダー";
    const projectLabel = linkedProject?.externalCalendarName?.trim();
    const label = projectLabel && projectLabel !== calendarLabel ? `${projectLabel} / ${calendarLabel}` : calendarLabel;

    return {
      key: `${account.accountId}:${calendar.id}`,
      accountId: account.accountId,
      calendarId: calendar.id,
      label,
      accountLabel,
      calendarLabel,
      projectId: linkedProject?.projectId,
    };
  });
});

const createInitialFormState = (selectedDate: Date, defaultKey: string): ComposerFormState => ({
  selectedKey: defaultKey,
  title: "",
  description: "",
  location: "",
  ...buildDefaultDateRange(selectedDate),
});

const MobileCalendarEventComposer = ({ isOpen, selectedDate, accounts, projectCalendarLinks, onClose, onAddCalendar, onCreateEvent }: MobileCalendarEventComposerProps) => {
  const calendarOptions = useMemo(() => buildCalendarOptions(accounts, projectCalendarLinks), [accounts, projectCalendarLinks]);
  const defaultCalendarKey = calendarOptions[0]?.key ?? "";
  const [formState, setFormState] = useState<ComposerFormState>(() => createInitialFormState(selectedDate, defaultCalendarKey));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setFormState((currentState) => {
      const nextState = createInitialFormState(selectedDate, defaultCalendarKey);
      if (currentState.selectedKey && calendarOptions.some((option) => option.key === currentState.selectedKey)) {
        nextState.selectedKey = currentState.selectedKey;
      }

      return nextState;
    });
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [calendarOptions, defaultCalendarKey, isOpen, selectedDate]);

  useEffect(() => {
    if (!formState.selectedKey && defaultCalendarKey) {
      setFormState((currentState) => ({ ...currentState, selectedKey: defaultCalendarKey }));
    }
  }, [defaultCalendarKey, formState.selectedKey]);

  const selectedCalendar = useMemo(() => calendarOptions.find((option) => option.key === formState.selectedKey) ?? null, [calendarOptions, formState.selectedKey]);
  const hasWritableCalendar = calendarOptions.length > 0;

  const updateField = useCallback(<K extends keyof ComposerFormState>(field: K, value: ComposerFormState[K]) => {
    setFormState((currentState) => ({ ...currentState, [field]: value }));
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (open) return;

    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCalendar) {
      setErrorMessage("予定を書き込める Google カレンダーがありません。");
      return;
    }

    if (!formState.title.trim()) {
      setErrorMessage("タイトルを入力してください。");
      return;
    }

    const startsAt = new Date(formState.startsAt);
    const endsAt = new Date(formState.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setErrorMessage("開始日時と終了日時を確認してください。");
      return;
    }

    if (endsAt <= startsAt) {
      setErrorMessage("終了日時は開始日時より後にしてください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onCreateEvent(selectedCalendar.accountId, {
        calendarId: selectedCalendar.calendarId,
        title: formState.title.trim(),
        description: formState.description.trim() || undefined,
        location: formState.location.trim() || undefined,
        startsAt,
        endsAt,
        projectId: selectedCalendar.projectId,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "予定の作成に失敗しました。";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formState.description, formState.endsAt, formState.location, formState.startsAt, formState.title, onClose, onCreateEvent, selectedCalendar]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="w-[min(100vw-24px,480px)] max-w-[480px] gap-0 overflow-hidden rounded-[28px] border border-[rgba(28,28,30,0.08)] bg-white p-0 shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
        closeLabel="閉じる"
      >
        <DialogHeader className="border-b border-[rgba(60,60,67,0.1)] px-5 pb-4 pt-5 text-left">
          <DialogTitle className="text-[20px] font-semibold tracking-[-0.03em] text-[#1c1c1e]">新規予定</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] leading-5 text-[#6e6e73]">
            モバイル表示から Google カレンダーに予定を追加します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {!hasWritableCalendar ? (
            <div className="rounded-[20px] border border-dashed border-[rgba(60,60,67,0.2)] bg-[#fafafa] p-4 text-left">
              <p className="text-[14px] font-medium text-[#1c1c1e]">連携済みカレンダーがありません</p>
              <p className="mt-1 text-[13px] leading-5 text-[#6e6e73]">先に Google カレンダーを追加すると、ここから予定を作成できます。</p>
              <button
                type="button"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-[#1c1c1e] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2c2c2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7cc]"
                onClick={onAddCalendar}
              >
                Google カレンダーを追加
              </button>
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold tracking-[0.01em] text-[#6e6e73]">カレンダー</span>
                <select
                  value={formState.selectedKey}
                  onChange={(event) => updateField("selectedKey", event.target.value)}
                  className="h-11 rounded-[16px] border border-[rgba(60,60,67,0.14)] bg-white px-3 text-[14px] text-[#1c1c1e] outline-none transition focus:border-[#1c1c1e]"
                >
                  {calendarOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.accountLabel} / {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold tracking-[0.01em] text-[#6e6e73]">タイトル</span>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="例: 週次ミーティング"
                  className="h-11 rounded-[16px] border border-[rgba(60,60,67,0.14)] bg-white px-3 text-[14px] text-[#1c1c1e] outline-none transition placeholder:text-[#c7c7cc] focus:border-[#1c1c1e]"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold tracking-[0.01em] text-[#6e6e73]">開始</span>
                <input
                  type="datetime-local"
                  value={formState.startsAt}
                  onChange={(event) => updateField("startsAt", event.target.value)}
                  className="h-11 rounded-[16px] border border-[rgba(60,60,67,0.14)] bg-white px-3 text-[14px] text-[#1c1c1e] outline-none transition focus:border-[#1c1c1e]"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold tracking-[0.01em] text-[#6e6e73]">終了</span>
                <input
                  type="datetime-local"
                  value={formState.endsAt}
                  onChange={(event) => updateField("endsAt", event.target.value)}
                  className="h-11 rounded-[16px] border border-[rgba(60,60,67,0.14)] bg-white px-3 text-[14px] text-[#1c1c1e] outline-none transition focus:border-[#1c1c1e]"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold tracking-[0.01em] text-[#6e6e73]">場所</span>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) => updateField("location", event.target.value)}
                  placeholder="任意"
                  className="h-11 rounded-[16px] border border-[rgba(60,60,67,0.14)] bg-white px-3 text-[14px] text-[#1c1c1e] outline-none transition placeholder:text-[#c7c7cc] focus:border-[#1c1c1e]"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold tracking-[0.01em] text-[#6e6e73]">説明</span>
                <textarea
                  value={formState.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={4}
                  placeholder="任意"
                  className="min-h-[104px] rounded-[16px] border border-[rgba(60,60,67,0.14)] bg-white px-3 py-2.5 text-[14px] leading-5 text-[#1c1c1e] outline-none transition placeholder:text-[#c7c7cc] focus:border-[#1c1c1e]"
                />
              </label>
            </>
          )}

          {errorMessage ? (
            <p className={cn("rounded-[14px] bg-[#fff1f0] px-3 py-2 text-[13px] leading-5 text-[#c93c37]", !hasWritableCalendar && "mt-2")}>
              {errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[rgba(60,60,67,0.1)] px-5 py-4 sm:justify-between sm:space-x-0">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[rgba(60,60,67,0.16)] px-4 text-[14px] font-semibold text-[#3a3a3c] transition hover:bg-[#f7f7f7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6]"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#1c1c1e] px-5 text-[14px] font-semibold text-white transition hover:bg-[#2c2c2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => { void handleSubmit(); }}
            disabled={!hasWritableCalendar || isSubmitting}
          >
            {isSubmitting ? "作成中..." : "予定を作成"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { MobileCalendarEventComposer };
