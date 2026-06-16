import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarEventChipList } from "@web-renderer/chip/eventchip/EventChip.list";
import { CalendarEventChipMonth } from "@web-renderer/chip/eventchip/EventChip.month";
import { eventChipDesign } from "@web-renderer/chip/eventchip/eventChipDesign.generated";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import * as GRID from "@/features/calendar/grid/grid.layout.constants.desktop";
import type { CalendarGridStyle } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type AutosaveState = "idle" | "saving" | "saved" | "failed";
type EditorValues = {
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
  weekdayTimedOuterInset: number;
  weekdayTimedOverlapGap: number;
  weekdayTimedVerticalTrim: number;
  weekdayTimedMinHeight: number;
  weekdayAllDayColumnInset: number;
  weekdayAllDayEventGap: number;
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
type NumberKey = {
  [Key in keyof EditorValues]: EditorValues[Key] extends number ? Key : never;
}[keyof EditorValues];
type Control = {
  valueKey: NumberKey;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
};
type Section = {
  title: string;
  controls: readonly Control[];
};
type NumberControlProps = Control & {
  value: number;
  onChange: (key: NumberKey, value: number) => void;
};
type ControlPanelProps = {
  section: Section;
  values: EditorValues;
  onChange: (key: NumberKey, value: number) => void;
};
type SampleTitlePanelProps = {
  sampleTitle: string;
  allDayTitle: string;
  onChangeSampleTitle: (value: string) => void;
  onChangeAllDayTitle: (value: string) => void;
};
type RealWeekdayGridPreviewProps = {
  title: string;
  heightClassName: string;
  gridStyle: CalendarGridStyle;
  visibleEvents: GoogleCalendarEvent[];
};
type MonthPreviewProps = {
  values: EditorValues;
  event: GoogleCalendarEvent;
  allDayEvent: GoogleCalendarEvent;
};
type ListPreviewProps = {
  event: GoogleCalendarEvent;
  allDayEvent: GoogleCalendarEvent;
};

const AUTOSAVE_ENDPOINT = "/__sivflow/eventchip-design";
const AUTOSAVE_DELAY_MS = 450;
const PANEL_CLASS = "rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm";
const LABEL_CLASS = "text-xs font-semibold text-slate-600";
const INPUT_CLASS = "h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-xs font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
const TEXTAREA_CLASS = "min-h-16 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
const PRESET_BUTTON_CLASS = "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100";
const CARD_CLASS = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const REAL_GRID_FRAME_CLASS = "overflow-hidden rounded-2xl border border-slate-200 bg-white";
const DEFAULT_SAMPLE_TITLE = "授業・復習";
const DEFAULT_ALL_DAY_TITLE = "終日予定";
const START = new Date("2026-06-08T17:07:00+09:00");
const END = new Date("2026-06-08T19:14:00+09:00");
const ALL_DAY_START = new Date("2026-06-08T00:00:00+09:00");
const ALL_DAY_END = new Date("2026-06-09T00:00:00+09:00");
const PREVIEW_DATE = new Date("2026-06-08T00:00:00+09:00");
const DESKTOP_WEEKDAY_GRID_STYLE = { [GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT]: `${C.DEFAULT_HOUR_ROW_HEIGHT}px` } as CalendarGridStyle;
const MOBILE_WEEK_WEEKDAY_GRID_STYLE = { [GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT]: `${C.DEFAULT_HOUR_ROW_HEIGHT / 2}px` } as CalendarGridStyle;
const SAMPLE_TITLE_PRESETS = ["英語", "授業・復習", "英語長文の復習と単語チェック", "来週の数学小テスト対策プリントを解いて間違えた問題だけ復習する", "これはかなり長い予定タイトルで、週表示・月表示・リスト表示の省略や折り返しの見え方を確認するためのサンプルです"] as const;
const ALL_DAY_TITLE_PRESETS = ["休み", "終日予定", "燃えないごみ", "学校行事・提出物確認", "終日予定のタイトルが長い場合に月表示や終日欄でどのように省略されるか確認する"] as const;
const SECTIONS: readonly Section[] = [
  {
    title: "月表示",
    controls: [
      { valueKey: "monthHeight", label: "高さ", min: 12, max: 34, step: 0.1 },
      { valueKey: "monthGap", label: "予定どうしの間隔", min: 0, max: 10, step: 0.5 },
      { valueKey: "monthRadius", label: "角丸", min: 0, max: 14 },
      { valueKey: "monthBorderWidth", label: "左の色線", min: 0, max: 8 },
      { valueKey: "monthPaddingLeft", label: "左余白", min: 0, max: 12 },
      { valueKey: "monthPaddingRight", label: "右余白", min: 0, max: 12 },
      { valueKey: "monthPaddingYWithTime", label: "時刻あり上下余白", min: 0, max: 8 },
      { valueKey: "monthPaddingYCompact", label: "時刻なし上下余白", min: 0, max: 8 },
      { valueKey: "monthTitleFontSize", label: "タイトル文字", min: 8, max: 16 },
      { valueKey: "monthTimeFontSize", label: "時刻文字", min: 7, max: 14 },
    ],
  },
  {
    title: "週・日表示チップ",
    controls: [
      { valueKey: "weekdayRadius", label: "角丸", min: 0, max: 18 },
      { valueKey: "weekdayBorderWidth", label: "左の色線", min: 0, max: 8 },
      { valueKey: "weekdayPaddingLeft", label: "左余白", min: 0, max: 14 },
      { valueKey: "weekdayPaddingRight", label: "右余白", min: 0, max: 14 },
      { valueKey: "weekdayPaddingY", label: "上下余白", min: 0, max: 10 },
      { valueKey: "weekdayInlinePaddingY", label: "横並び時の上下余白", min: 0, max: 10 },
      { valueKey: "weekdayGap", label: "タイトルと時刻の間隔", min: 0, max: 6, step: 0.5 },
      { valueKey: "weekdayTitleFontSize", label: "タイトル文字", min: 8, max: 18 },
      { valueKey: "weekdayTitleLineHeight", label: "タイトル行高", min: 10, max: 26 },
      { valueKey: "weekdayTimeFontSize", label: "時刻文字", min: 8, max: 16 },
      { valueKey: "weekdayTimeLineHeight", label: "時刻行高", min: 10, max: 24 },
    ],
  },
  {
    title: "週・日グリッド余白",
    controls: [
      { valueKey: "weekdayTimedOuterInset", label: "罫線との左右余白", min: 0, max: 10, step: 0.5 },
      { valueKey: "weekdayTimedOverlapGap", label: "重なり予定の横間隔", min: 0, max: 12, step: 0.5 },
      { valueKey: "weekdayTimedVerticalTrim", label: "下端の詰め", min: 0, max: 8, step: 0.5 },
      { valueKey: "weekdayTimedMinHeight", label: "短い予定の最小高さ", min: 8, max: 48 },
      { valueKey: "weekdayAllDayColumnInset", label: "終日欄の内側余白", min: 0, max: 8, step: 0.5 },
      { valueKey: "weekdayAllDayEventGap", label: "終日予定の縦間隔", min: 0, max: 8, step: 0.5 },
    ],
  },
  {
    title: "リスト・ツールチップ",
    controls: [
      { valueKey: "listRowHeight", label: "リスト行高", min: 32, max: 80 },
      { valueKey: "listChipHeight", label: "リストチップ高さ", min: 24, max: 70 },
      { valueKey: "listAllDayRowHeight", label: "終日行高", min: 24, max: 60 },
      { valueKey: "listAllDayChipHeight", label: "終日チップ高さ", min: 18, max: 50 },
      { valueKey: "listRadius", label: "リスト角丸", min: 0, max: 18 },
      { valueKey: "listBorderWidth", label: "リスト左線", min: 0, max: 8 },
      { valueKey: "listTitleFontSize", label: "リストタイトル文字", min: 8, max: 16 },
      { valueKey: "listTimeFontSize", label: "リスト時刻文字", min: 8, max: 16 },
      { valueKey: "listTitleGap", label: "リストタイトル上余白", min: 0, max: 8, step: 0.5 },
      { valueKey: "tooltipMonthRadius", label: "月ツールチップ角丸", min: 0, max: 24 },
      { valueKey: "tooltipWeekdayRadius", label: "週・日ツールチップ角丸", min: 0, max: 28 },
    ],
  },
];
const getInitialValues = (): EditorValues => ({
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
  weekdayTimedOuterInset: eventChipDesign.weekdayGrid.timedOuterInsetPx,
  weekdayTimedOverlapGap: eventChipDesign.weekdayGrid.timedOverlapGapPx,
  weekdayTimedVerticalTrim: eventChipDesign.weekdayGrid.timedVerticalTrimPx,
  weekdayTimedMinHeight: eventChipDesign.weekdayGrid.timedMinHeightPx,
  weekdayAllDayColumnInset: eventChipDesign.weekdayGrid.allDayColumnInsetPx,
  weekdayAllDayEventGap: eventChipDesign.weekdayGrid.allDayEventGapPx,
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
const makeEvent = (accentColor: string, title: string): GoogleCalendarEvent => ({ id: "eventchip-editor-sample", calendarId: "eventchip-editor-calendar", title, startsAt: START, endsAt: END, isAllDay: false, accentColor });
const makeAllDayEvent = (accentColor: string, title: string): GoogleCalendarEvent => ({ id: "eventchip-editor-all-day-sample", calendarId: "eventchip-editor-calendar", title, startsAt: ALL_DAY_START, endsAt: ALL_DAY_END, isAllDay: true, accentColor });
const getAutosaveLabel = (state: AutosaveState): string => state === "saving" ? "保存中" : state === "saved" ? "保存済み" : state === "failed" ? "保存失敗" : "自動保存";

const NumberControl = ({ valueKey, label, value, min, max, step = 1, unit = "px", onChange }: NumberControlProps) => {
  const handleChange = (inputValue: string) => {
    const nextValue = Number.parseFloat(inputValue);
    if (Number.isFinite(nextValue)) onChange(valueKey, nextValue);
  };
  return <label className="flex flex-col gap-2"><span className={LABEL_CLASS}>{label}</span><div className="grid grid-cols-[1fr_auto] items-center gap-3"><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => handleChange(event.target.value)} /><span className="flex items-center gap-1"><input className={INPUT_CLASS} type="number" min={min} max={max} step={step} value={value} onChange={(event) => handleChange(event.target.value)} /><span className="w-8 text-xs font-medium text-slate-400">{unit}</span></span></div></label>;
};
const ControlPanel = ({ section, values, onChange }: ControlPanelProps) => <section className={PANEL_CLASS}><h2 className="text-sm font-bold text-slate-900">{section.title}</h2><div className="mt-4 grid gap-4">{section.controls.map((control) => <NumberControl key={control.valueKey} {...control} value={values[control.valueKey]} onChange={onChange} />)}</div></section>;
const SampleTitlePanel = ({ sampleTitle, allDayTitle, onChangeSampleTitle, onChangeAllDayTitle }: SampleTitlePanelProps) => <section className={PANEL_CLASS}><h2 className="text-sm font-bold text-slate-900">タイトル確認</h2><div className="mt-4 grid gap-4"><label className="flex flex-col gap-2"><span className={LABEL_CLASS}>時間あり予定タイトル</span><textarea className={TEXTAREA_CLASS} value={sampleTitle} onChange={(event) => onChangeSampleTitle(event.target.value)} /><div className="flex flex-wrap gap-2">{SAMPLE_TITLE_PRESETS.map((title) => <button key={title} type="button" className={PRESET_BUTTON_CLASS} onClick={() => onChangeSampleTitle(title)}>{title.length}文字</button>)}</div></label><label className="flex flex-col gap-2"><span className={LABEL_CLASS}>終日予定タイトル</span><textarea className={TEXTAREA_CLASS} value={allDayTitle} onChange={(event) => onChangeAllDayTitle(event.target.value)} /><div className="flex flex-wrap gap-2">{ALL_DAY_TITLE_PRESETS.map((title) => <button key={title} type="button" className={PRESET_BUTTON_CLASS} onClick={() => onChangeAllDayTitle(title)}>{title.length}文字</button>)}</div></label><p className="text-xs leading-5 text-slate-400">ここは表示確認用です。source には保存しません。</p></div></section>;
const RealWeekdayGridPreview = ({ title, heightClassName, gridStyle, visibleEvents }: RealWeekdayGridPreviewProps) => {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const visibleDays = useMemo(() => [PREVIEW_DATE], []);
  return <section className={CARD_CLASS}><div className="mb-4"><p className="text-xs font-semibold tracking-widest text-slate-400">実グリッド</p><h2 className="text-base font-semibold text-slate-900">{title}</h2></div><div className={`${REAL_GRID_FRAME_CLASS} ${heightClassName}`}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={visibleEvents} calendarGridStyle={gridStyle} selectedDate={PREVIEW_DATE} /></div></section>;
};
const MonthPreview = ({ values, event, allDayEvent }: MonthPreviewProps) => <section className={CARD_CLASS}><div className="mb-4 flex items-baseline justify-between gap-3"><><p className="text-xs font-semibold tracking-widest text-slate-400">実コンポーネント</p><h2 className="text-base font-semibold text-slate-900">月表示チップ</h2></><span className="text-xs font-medium text-slate-400">間隔 {values.monthGap}px</span></div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-semibold text-slate-400">PC 月表示 / 時刻あり</p><div className="flex w-full flex-col" style={{ gap: values.monthGap }}><CalendarEventChipMonth event={event} showTimeLabel tooltipDisabled /><CalendarEventChipMonth event={allDayEvent} showTimeLabel={false} tooltipDisabled /></div></div><div className="w-96 max-w-full rounded-2xl border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-semibold text-slate-400">モバイル月表示 / 時刻なし</p><div className="flex w-full flex-col" style={{ gap: values.monthGap }}><CalendarEventChipMonth event={event} showTimeLabel={false} tooltipDisabled /><CalendarEventChipMonth event={allDayEvent} showTimeLabel={false} tooltipDisabled /></div></div></div></section>;
const ListPreview = ({ event, allDayEvent }: ListPreviewProps) => <section className={CARD_CLASS}><div className="mb-4"><p className="text-xs font-semibold tracking-widest text-slate-400">実コンポーネント</p><h2 className="text-base font-semibold text-slate-900">リスト表示チップ</h2></div><div className="rounded-2xl border border-slate-200 bg-white p-3"><CalendarEventChipList event={event} /><CalendarEventChipList event={allDayEvent} /></div></section>;
const EventChipEditorSandboxPage = () => {
  const [values, setValues] = useState(getInitialValues);
  const [sampleTitle, setSampleTitle] = useState(DEFAULT_SAMPLE_TITLE);
  const [allDayTitle, setAllDayTitle] = useState(DEFAULT_ALL_DAY_TITLE);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const event = useMemo(() => makeEvent(values.accentColor, sampleTitle), [sampleTitle, values.accentColor]);
  const allDayEvent = useMemo(() => makeAllDayEvent(values.accentColor, allDayTitle), [allDayTitle, values.accentColor]);
  const visibleEvents = useMemo(() => [event, allDayEvent], [allDayEvent, event]);
  useEffect(() => {
    const abortController = new AbortController();
    const timer = window.setTimeout(() => {
      setAutosaveState("saving");
      fetch(AUTOSAVE_ENDPOINT, { body: JSON.stringify(values), headers: { "Content-Type": "application/json" }, method: "PUT", signal: abortController.signal }).then((response) => {
        if (!response.ok) throw new Error(`Failed to save EventChip design: ${response.status}`);
        setAutosaveState("saved");
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAutosaveState("failed");
      });
    }, AUTOSAVE_DELAY_MS);
    return () => { abortController.abort(); window.clearTimeout(timer); };
  }, [values]);
  const updateNumberValue = (key: NumberKey, value: number) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
    setAutosaveState("idle");
  };
  return <div className="min-h-screen bg-[#f4f7fb] px-4 py-4 text-slate-900"><div className="mx-auto flex max-w-96 flex-col gap-4"><section className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold tracking-widest text-sky-500">イベントチップ調整</p><h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">表示調整</h1></div><span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">{getAutosaveLabel(autosaveState)}</span></div></section><div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]"><aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-32px)] xl:overflow-auto xl:pr-1"><SampleTitlePanel sampleTitle={sampleTitle} allDayTitle={allDayTitle} onChangeSampleTitle={setSampleTitle} onChangeAllDayTitle={setAllDayTitle} /><section className={PANEL_CLASS}><h2 className="text-sm font-bold text-slate-900">色</h2><div className="mt-4 grid gap-4"><label className="flex flex-col gap-2"><span className={LABEL_CLASS}>サンプル色</span><input className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" value={values.accentColor} onChange={(inputEvent) => { setValues((currentValues) => ({ ...currentValues, accentColor: inputEvent.target.value })); setAutosaveState("idle"); }} /></label><NumberControl valueKey="backgroundAlpha" label="背景の濃さ" min={0.04} max={0.5} step={0.01} unit="" value={values.backgroundAlpha} onChange={updateNumberValue} /></div></section>{SECTIONS.map((section) => <ControlPanel key={section.title} section={section} values={values} onChange={updateNumberValue} />)}</aside><main className="grid gap-4"><RealWeekdayGridPreview title="PC の週・日グリッド" heightClassName="h-96" gridStyle={DESKTOP_WEEKDAY_GRID_STYLE} visibleEvents={visibleEvents} /><RealWeekdayGridPreview title="モバイル週表示グリッド" heightClassName="h-96" gridStyle={MOBILE_WEEK_WEEKDAY_GRID_STYLE} visibleEvents={visibleEvents} /><div className="grid gap-4 lg:grid-cols-2"><MonthPreview values={values} event={event} allDayEvent={allDayEvent} /><ListPreview event={event} allDayEvent={allDayEvent} /></div></main></div></div></div>;
};

export { EventChipEditorSandboxPage };
