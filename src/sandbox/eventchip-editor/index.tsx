import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { CalendarEventChipMonth } from "@/chip/eventchip/EventChip.month";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { eventChipDesign } from "@/chip/eventchip/eventChipDesign.generated";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type EventChipEditorValues = {
  accentColor: string;
  backgroundAlpha: number;
  monthHeight: number;
  monthRadius: number;
  monthBorderWidth: number;
  monthPaddingLeft: number;
  monthPaddingRight: number;
  monthPaddingYWithTime: number;
  monthPaddingYCompact: number;
  monthTitleFontSize: number;
  monthTimeFontSize: number;
  monthGap: number;
  monthAllDayOffset: number;
  weekdayHeight: number;
  weekdayRadius: number;
  weekdayBorderWidth: number;
  weekdayPaddingLeft: number;
  weekdayPaddingRight: number;
  weekdayPaddingY: number;
  weekdayInlinePaddingY: number;
  weekdayGap: number;
  weekdayTitleFontSize: number;
  weekdayTitleLineHeight: number;
  weekdayTimeFontSize: number;
  weekdayTimeLineHeight: number;
  listRowHeight: number;
  listChipHeight: number;
  listAllDayRowHeight: number;
  listAllDayChipHeight: number;
  listRadius: number;
  listBorderWidth: number;
  listTitleFontSize: number;
  listTimeFontSize: number;
  listTitleGap: number;
  tooltipMonthRadius: number;
  tooltipWeekdayRadius: number;
};

type NumberControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

type RealPreviewProps = {
  values: EventChipEditorValues;
  event: GoogleCalendarEvent;
  allDayEvent: GoogleCalendarEvent;
};

type AutosaveState = "idle" | "saving" | "saved" | "failed";

const AUTOSAVE_ENDPOINT = "/__sivflow/eventchip-design";
const AUTOSAVE_DELAY_MS = 450;
const CONTROL_PANEL_CLASS_NAME = "rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm";
const CONTROL_LABEL_CLASS_NAME = "text-[12px] font-semibold text-slate-600";
const CONTROL_INPUT_CLASS_NAME = "h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-[12px] font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
const PREVIEW_CARD_CLASS_NAME = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
const SAMPLE_EVENT_START = new Date("2026-06-08T17:07:00+09:00");
const SAMPLE_EVENT_END = new Date("2026-06-08T19:14:00+09:00");
const SAMPLE_ALL_DAY_START = new Date("2026-06-08T00:00:00+09:00");
const SAMPLE_ALL_DAY_END = new Date("2026-06-09T00:00:00+09:00");

const getInitialValues = (): EventChipEditorValues => ({
  accentColor: "#2f9f6b",
  backgroundAlpha: eventChipDesign.backgroundAlpha,
  monthHeight: eventChipDesign.month.heightPx,
  monthRadius: eventChipDesign.month.radiusPx,
  monthBorderWidth: eventChipDesign.month.borderWidthPx,
  monthPaddingLeft: eventChipDesign.month.paddingLeftPx,
  monthPaddingRight: eventChipDesign.month.paddingRightPx,
  monthPaddingYWithTime: eventChipDesign.month.paddingYWithTimePx,
  monthPaddingYCompact: eventChipDesign.month.paddingYCompactPx,
  monthTitleFontSize: eventChipDesign.month.titleFontSizePx,
  monthTimeFontSize: eventChipDesign.month.timeFontSizePx,
  monthGap: eventChipDesign.month.gapPx,
  monthAllDayOffset: eventChipDesign.month.allDayOffsetPx,
  weekdayHeight: 72,
  weekdayRadius: eventChipDesign.weekday.radiusPx,
  weekdayBorderWidth: eventChipDesign.weekday.borderWidthPx,
  weekdayPaddingLeft: eventChipDesign.weekday.paddingLeftPx,
  weekdayPaddingRight: eventChipDesign.weekday.paddingRightPx,
  weekdayPaddingY: eventChipDesign.weekday.paddingYPx,
  weekdayInlinePaddingY: eventChipDesign.weekday.inlinePaddingYPx,
  weekdayGap: eventChipDesign.weekday.gapPx,
  weekdayTitleFontSize: eventChipDesign.weekday.titleFontSizePx,
  weekdayTitleLineHeight: eventChipDesign.weekday.titleLineHeightPx,
  weekdayTimeFontSize: eventChipDesign.weekday.timeFontSizePx,
  weekdayTimeLineHeight: eventChipDesign.weekday.timeLineHeightPx,
  listRowHeight: eventChipDesign.list.rowHeightPx,
  listChipHeight: eventChipDesign.list.chipHeightPx,
  listAllDayRowHeight: eventChipDesign.list.allDayRowHeightPx,
  listAllDayChipHeight: eventChipDesign.list.allDayChipHeightPx,
  listRadius: eventChipDesign.list.radiusPx,
  listBorderWidth: eventChipDesign.list.borderWidthPx,
  listTitleFontSize: eventChipDesign.list.titleFontSizePx,
  listTimeFontSize: eventChipDesign.list.timeFontSizePx,
  listTitleGap: eventChipDesign.list.titleGapPx,
  tooltipMonthRadius: eventChipDesign.tooltip.monthRadiusPx,
  tooltipWeekdayRadius: eventChipDesign.tooltip.weekdayRadiusPx,
});

const NumberControl = ({ label, value, min, max, step = 1, unit = "px", onChange }: NumberControlProps) => {
  const handleChange = (nextValue: string) => {
    const parsedValue = Number.parseFloat(nextValue);
    if (!Number.isFinite(parsedValue)) return;

    onChange(parsedValue);
  };

  return (
    <label className="flex flex-col gap-2">
      <span className={CONTROL_LABEL_CLASS_NAME}>{label}</span>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => handleChange(event.target.value)} />
        <span className="flex items-center gap-1">
          <input className={CONTROL_INPUT_CLASS_NAME} type="number" min={min} max={max} step={step} value={value} onChange={(event) => handleChange(event.target.value)} />
          <span className="w-8 text-[11px] font-medium text-slate-400">{unit}</span>
        </span>
      </div>
    </label>
  );
};

const createSampleEvent = (accentColor: string): GoogleCalendarEvent => ({
  id: "eventchip-editor-sample",
  calendarId: "eventchip-editor-calendar",
  title: "講義・波動復習",
  startsAt: SAMPLE_EVENT_START,
  endsAt: SAMPLE_EVENT_END,
  isAllDay: false,
  accentColor,
});

const createSampleAllDayEvent = (accentColor: string): GoogleCalendarEvent => ({
  id: "eventchip-editor-all-day-sample",
  calendarId: "eventchip-editor-calendar",
  title: "燃えないごみ",
  startsAt: SAMPLE_ALL_DAY_START,
  endsAt: SAMPLE_ALL_DAY_END,
  isAllDay: true,
  accentColor,
});

const RealMonthPreview = ({ values, event, allDayEvent }: RealPreviewProps) => {
  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Real component</p>
          <h2 className="text-base font-semibold text-slate-900">CalendarEventChipMonth</h2>
        </div>
        <span className="text-[11px] font-medium text-slate-400">gap {values.monthGap}px</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold text-slate-400">desktop month / time shown</p>
          <div className="flex w-full flex-col" style={{ gap: values.monthGap }}>
            <CalendarEventChipMonth event={event} showTimeLabel tooltipDisabled />
            <CalendarEventChipMonth event={allDayEvent} showTimeLabel={false} tooltipDisabled />
          </div>
        </div>
        <div className="w-[390px] max-w-full rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold text-slate-400">mobile month / time hidden</p>
          <div className="flex w-full flex-col" style={{ gap: values.monthGap }}>
            <CalendarEventChipMonth event={event} showTimeLabel={false} tooltipDisabled />
            <CalendarEventChipMonth event={allDayEvent} showTimeLabel={false} tooltipDisabled />
          </div>
        </div>
      </div>
    </section>
  );
};

const RealWeekdayPreview = ({ values, event }: RealPreviewProps) => {
  const desktopFrameStyle: CSSProperties = { height: values.weekdayHeight, width: 220 };
  const mobileFrameStyle: CSSProperties = { height: values.weekdayHeight, width: 88 };
  const narrowFrameStyle: CSSProperties = { height: 24, width: 72 };

  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Real component</p>
          <h2 className="text-base font-semibold text-slate-900">CalendarEventChipWeekday</h2>
        </div>
        <span className="text-[11px] font-medium text-slate-400">desktop / mobile width</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold text-slate-400">desktop day column</p>
          <div className="relative isolate" style={desktopFrameStyle}>
            <CalendarEventChipWeekday event={event} tooltipDisabled />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold text-slate-400">mobile narrow column</p>
          <div className="relative isolate" style={mobileFrameStyle}>
            <CalendarEventChipWeekday event={event} tooltipDisabled />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold text-slate-400">short event fallback</p>
          <div className="relative isolate" style={narrowFrameStyle}>
            <CalendarEventChipWeekday event={event} tooltipDisabled />
          </div>
        </div>
      </div>
    </section>
  );
};

const RealListPreview = ({ event, allDayEvent }: RealPreviewProps) => {
  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Real component</p>
        <h2 className="text-base font-semibold text-slate-900">CalendarEventChipList</h2>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <CalendarEventChipList event={event} />
        <CalendarEventChipList event={allDayEvent} />
      </div>
    </section>
  );
};

const EventChipEditorSandboxPage = () => {
  const [values, setValues] = useState<EventChipEditorValues>(getInitialValues);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const event = useMemo(() => createSampleEvent(values.accentColor), [values.accentColor]);
  const allDayEvent = useMemo(() => createSampleAllDayEvent(values.accentColor), [values.accentColor]);

  useEffect(() => {
    const abortController = new AbortController();
    const timer = window.setTimeout(() => {
      setAutosaveState("saving");
      fetch(AUTOSAVE_ENDPOINT, {
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
        signal: abortController.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Failed to save EventChip design: ${response.status}`);
          setAutosaveState("saved");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setAutosaveState("failed");
        });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      abortController.abort();
      window.clearTimeout(timer);
    };
  }, [values]);

  const updateValue = <Key extends keyof EventChipEditorValues>(key: Key, value: EventChipEditorValues[Key]) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
    setAutosaveState("idle");
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-sm">
          <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-sky-500">EventChip Sandbox</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950">EventChip design editor</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">プレビューは実際の EventChip コンポーネントを使います。変更は src/chip/eventchip/eventChipDesign.generated.ts に自動保存されます。</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[12px] font-semibold text-slate-600">{autosaveState === "saving" ? "Saving..." : autosaveState === "saved" ? "Saved to source" : autosaveState === "failed" ? "Save failed" : "Autosave ready"}</span>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-48px)] xl:overflow-auto xl:pr-1">
            <section className={CONTROL_PANEL_CLASS_NAME}>
              <h2 className="text-sm font-bold text-slate-900">Color</h2>
              <div className="mt-4 grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className={CONTROL_LABEL_CLASS_NAME}>Preview accent color</span>
                  <input className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" value={values.accentColor} onChange={(event) => updateValue("accentColor", event.target.value)} />
                </label>
                <NumberControl label="Background alpha" min={0.04} max={0.5} step={0.01} unit="" value={values.backgroundAlpha} onChange={(value) => updateValue("backgroundAlpha", value)} />
              </div>
            </section>

            <section className={CONTROL_PANEL_CLASS_NAME}>
              <h2 className="text-sm font-bold text-slate-900">Month</h2>
              <div className="mt-4 grid gap-4">
                <NumberControl label="Height" min={12} max={34} step={0.1} value={values.monthHeight} onChange={(value) => updateValue("monthHeight", value)} />
                <NumberControl label="Gap" min={0} max={10} step={0.5} value={values.monthGap} onChange={(value) => updateValue("monthGap", value)} />
                <NumberControl label="Radius" min={0} max={14} value={values.monthRadius} onChange={(value) => updateValue("monthRadius", value)} />
                <NumberControl label="Left border" min={0} max={8} value={values.monthBorderWidth} onChange={(value) => updateValue("monthBorderWidth", value)} />
                <NumberControl label="Padding left" min={0} max={12} value={values.monthPaddingLeft} onChange={(value) => updateValue("monthPaddingLeft", value)} />
                <NumberControl label="Padding right" min={0} max={12} value={values.monthPaddingRight} onChange={(value) => updateValue("monthPaddingRight", value)} />
                <NumberControl label="Padding Y time" min={0} max={8} value={values.monthPaddingYWithTime} onChange={(value) => updateValue("monthPaddingYWithTime", value)} />
                <NumberControl label="Padding Y compact" min={0} max={8} value={values.monthPaddingYCompact} onChange={(value) => updateValue("monthPaddingYCompact", value)} />
                <NumberControl label="All day offset" min={-4} max={6} value={values.monthAllDayOffset} onChange={(value) => updateValue("monthAllDayOffset", value)} />
                <NumberControl label="Title font" min={8} max={16} value={values.monthTitleFontSize} onChange={(value) => updateValue("monthTitleFontSize", value)} />
                <NumberControl label="Time font" min={7} max={14} value={values.monthTimeFontSize} onChange={(value) => updateValue("monthTimeFontSize", value)} />
              </div>
            </section>

            <section className={CONTROL_PANEL_CLASS_NAME}>
              <h2 className="text-sm font-bold text-slate-900">Weekday</h2>
              <div className="mt-4 grid gap-4">
                <NumberControl label="Preview height" min={20} max={140} value={values.weekdayHeight} onChange={(value) => updateValue("weekdayHeight", value)} />
                <NumberControl label="Radius" min={0} max={18} value={values.weekdayRadius} onChange={(value) => updateValue("weekdayRadius", value)} />
                <NumberControl label="Left border" min={0} max={8} value={values.weekdayBorderWidth} onChange={(value) => updateValue("weekdayBorderWidth", value)} />
                <NumberControl label="Padding left" min={0} max={14} value={values.weekdayPaddingLeft} onChange={(value) => updateValue("weekdayPaddingLeft", value)} />
                <NumberControl label="Padding right" min={0} max={14} value={values.weekdayPaddingRight} onChange={(value) => updateValue("weekdayPaddingRight", value)} />
                <NumberControl label="Padding Y" min={0} max={10} value={values.weekdayPaddingY} onChange={(value) => updateValue("weekdayPaddingY", value)} />
                <NumberControl label="Inline Padding Y" min={0} max={10} value={values.weekdayInlinePaddingY} onChange={(value) => updateValue("weekdayInlinePaddingY", value)} />
                <NumberControl label="Gap" min={0} max={6} step={0.5} value={values.weekdayGap} onChange={(value) => updateValue("weekdayGap", value)} />
                <NumberControl label="Title font" min={8} max={18} value={values.weekdayTitleFontSize} onChange={(value) => updateValue("weekdayTitleFontSize", value)} />
                <NumberControl label="Title line-height" min={10} max={26} value={values.weekdayTitleLineHeight} onChange={(value) => updateValue("weekdayTitleLineHeight", value)} />
                <NumberControl label="Time font" min={8} max={16} value={values.weekdayTimeFontSize} onChange={(value) => updateValue("weekdayTimeFontSize", value)} />
                <NumberControl label="Time line-height" min={10} max={24} value={values.weekdayTimeLineHeight} onChange={(value) => updateValue("weekdayTimeLineHeight", value)} />
              </div>
            </section>

            <section className={CONTROL_PANEL_CLASS_NAME}>
              <h2 className="text-sm font-bold text-slate-900">List / Tooltip</h2>
              <div className="mt-4 grid gap-4">
                <NumberControl label="List row" min={32} max={80} value={values.listRowHeight} onChange={(value) => updateValue("listRowHeight", value)} />
                <NumberControl label="List chip" min={24} max={70} value={values.listChipHeight} onChange={(value) => updateValue("listChipHeight", value)} />
                <NumberControl label="All day row" min={24} max={60} value={values.listAllDayRowHeight} onChange={(value) => updateValue("listAllDayRowHeight", value)} />
                <NumberControl label="All day chip" min={18} max={50} value={values.listAllDayChipHeight} onChange={(value) => updateValue("listAllDayChipHeight", value)} />
                <NumberControl label="List radius" min={0} max={18} value={values.listRadius} onChange={(value) => updateValue("listRadius", value)} />
                <NumberControl label="List left border" min={0} max={8} value={values.listBorderWidth} onChange={(value) => updateValue("listBorderWidth", value)} />
                <NumberControl label="List title font" min={8} max={16} value={values.listTitleFontSize} onChange={(value) => updateValue("listTitleFontSize", value)} />
                <NumberControl label="List time font" min={8} max={16} value={values.listTimeFontSize} onChange={(value) => updateValue("listTimeFontSize", value)} />
                <NumberControl label="List title gap" min={0} max={8} step={0.5} value={values.listTitleGap} onChange={(value) => updateValue("listTitleGap", value)} />
                <NumberControl label="Month tooltip radius" min={0} max={24} value={values.tooltipMonthRadius} onChange={(value) => updateValue("tooltipMonthRadius", value)} />
                <NumberControl label="Weekday tooltip radius" min={0} max={28} value={values.tooltipWeekdayRadius} onChange={(value) => updateValue("tooltipWeekdayRadius", value)} />
              </div>
            </section>
          </aside>

          <main className="grid gap-5">
            <RealWeekdayPreview values={values} event={event} allDayEvent={allDayEvent} />
            <div className="grid gap-5 lg:grid-cols-2">
              <RealMonthPreview values={values} event={event} allDayEvent={allDayEvent} />
              <RealListPreview values={values} event={event} allDayEvent={allDayEvent} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export { EventChipEditorSandboxPage };
