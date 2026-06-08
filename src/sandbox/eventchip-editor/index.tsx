import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { eventChipDesign } from "@/chip/eventchip/eventChipDesign.generated";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

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

type PreviewTokens = {
  background: string;
  border: string;
  text: string;
};

type PreviewProps = {
  values: EventChipEditorValues;
  tokens: PreviewTokens;
};

type AutosaveState = "idle" | "saving" | "saved" | "failed";

const AUTOSAVE_ENDPOINT = "/__sivflow/eventchip-design";
const AUTOSAVE_DELAY_MS = 450;
const CONTROL_PANEL_CLASS_NAME = "rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm";
const CONTROL_LABEL_CLASS_NAME = "text-[12px] font-semibold text-slate-600";
const CONTROL_INPUT_CLASS_NAME = "h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-[12px] font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
const PREVIEW_CARD_CLASS_NAME = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
const SAMPLE_TITLE = "講義・波動復習";
const SAMPLE_TIME_LABEL = "17:07 ~ 19:14";
const SAMPLE_ALL_DAY_TITLE = "燃えないごみ";

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

const formatEditorJson = (values: EventChipEditorValues): string => JSON.stringify(values, null, 2);

const createPreviewTokens = (values: EventChipEditorValues): PreviewTokens => {
  const tokens = generateColorTokens(values.accentColor);
  const match = /^#?([0-9a-fA-F]{6})$/.exec(values.accentColor.trim());
  if (!match) return { background: tokens.bg, border: tokens.border, text: tokens.text };

  const hex = match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return { background: `rgba(${red}, ${green}, ${blue}, ${values.backgroundAlpha})`, border: tokens.border, text: tokens.text };
};

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

const MonthPreview = ({ values, tokens }: PreviewProps) => {
  const chipStyle: CSSProperties = { alignItems: "center", background: tokens.background, borderLeft: `${values.monthBorderWidth}px solid ${tokens.border}`, borderRadius: values.monthRadius, color: tokens.text, display: "flex", height: values.monthHeight, minWidth: 0, overflow: "hidden", padding: `${values.monthPaddingYWithTime}px ${values.monthPaddingRight}px ${values.monthPaddingYWithTime}px ${values.monthPaddingLeft}px`, width: "100%" };
  const allDayStyle: CSSProperties = { ...chipStyle, paddingBottom: values.monthPaddingYCompact, paddingTop: values.monthPaddingYCompact, transform: `translateY(${values.monthAllDayOffset}px)` };

  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <h2 className="text-base font-semibold text-slate-900">Month chip</h2>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative h-[156px] overflow-hidden rounded-xl border border-slate-100 bg-white">
          <div className="absolute left-3 top-1 text-[13px] font-bold text-slate-900">8 <span className="text-[12px] font-semibold text-slate-400">6月</span></div>
          <div className="absolute inset-x-px top-8 flex flex-col" style={{ gap: values.monthGap }}>
            <div style={chipStyle}><span style={{ flex: 1, fontSize: values.monthTitleFontSize, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SAMPLE_TITLE}</span><span style={{ flexShrink: 0, fontSize: values.monthTimeFontSize, fontWeight: 600, lineHeight: 1, marginLeft: 4, opacity: 0.8, whiteSpace: "nowrap" }}>{SAMPLE_TIME_LABEL}</span></div>
            <div style={allDayStyle}><span style={{ flex: 1, fontSize: values.monthTitleFontSize, fontWeight: 600, lineHeight: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SAMPLE_ALL_DAY_TITLE}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
};

const WeekdayPreview = ({ values, tokens }: PreviewProps) => {
  const chipStyle: CSSProperties = { background: tokens.background, borderLeft: `${values.weekdayBorderWidth}px solid ${tokens.border}`, borderRadius: values.weekdayRadius, color: tokens.text, display: "flex", flexDirection: "column", gap: values.weekdayGap, height: values.weekdayHeight, minHeight: 0, overflow: "hidden", padding: `${values.weekdayPaddingY}px ${values.weekdayPaddingRight}px ${values.weekdayPaddingY}px ${values.weekdayPaddingLeft}px`, width: "100%" };

  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <h2 className="text-base font-semibold text-slate-900">Weekday chip</h2>
      <div className="mt-4 grid grid-cols-[48px_minmax(0,1fr)] rounded-2xl border border-slate-200 bg-white">
        <div className="border-r border-slate-100 p-2 text-right text-[11px] font-medium text-slate-400">17:00</div>
        <div className="relative min-h-[180px] bg-white"><div className="h-[72px] border-b border-slate-100" /><div className="h-[72px] border-b border-slate-100" /><div className="absolute left-1 right-1 top-6"><div className="relative isolate"><div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white" style={{ borderRadius: values.weekdayRadius }} /><div style={chipStyle}><span style={{ fontSize: values.weekdayTitleFontSize, fontWeight: 500, lineHeight: `${values.weekdayTitleLineHeight}px`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SAMPLE_TITLE}</span><span style={{ fontSize: values.weekdayTimeFontSize, fontWeight: 600, lineHeight: `${values.weekdayTimeLineHeight}px`, opacity: 0.8, whiteSpace: "nowrap" }}>{SAMPLE_TIME_LABEL}</span></div></div></div></div>
      </div>
    </section>
  );
};

const ListPreview = ({ values, tokens }: PreviewProps) => {
  const chipStyle: CSSProperties = { background: tokens.background, borderLeft: `${values.listBorderWidth}px solid ${tokens.border}`, borderRadius: values.listRadius, color: tokens.text, height: values.listChipHeight, overflow: "hidden", padding: "2px 8px 2px 6px", width: "100%" };

  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <h2 className="text-base font-semibold text-slate-900">List chip</h2>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3"><div className="grid grid-cols-[54px_26px_minmax(0,1fr)] items-stretch" style={{ height: values.listRowHeight }}><div className="justify-self-end bg-white px-1 pt-2.5 text-right text-[11px] font-medium tabular-nums text-slate-400">17:07</div><div className="relative flex justify-center"><span aria-hidden="true" className="absolute -bottom-1.5 top-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" /><span aria-hidden="true" className="relative mt-2 h-2 w-2 rounded-full border-2 bg-white" style={{ borderColor: tokens.border, boxShadow: `0 0 0 3px ${tokens.background}` }} /></div><div style={chipStyle}><div style={{ fontSize: values.listTimeFontSize, fontWeight: 600, opacity: 0.8, whiteSpace: "nowrap" }}>17:07 - 19:14（2時間7分）</div><div style={{ fontSize: values.listTitleFontSize, fontWeight: 600, lineHeight: 1.375, marginTop: values.listTitleGap }}>{SAMPLE_TITLE}</div></div></div></div>
    </section>
  );
};

const EventChipEditorSandboxPage = () => {
  const [values, setValues] = useState<EventChipEditorValues>(getInitialValues);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const tokens = useMemo(() => createPreviewTokens(values), [values]);
  const designJson = useMemo(() => formatEditorJson(values), [values]);

  useEffect(() => {
    const abortController = new AbortController();
    const timer = window.setTimeout(() => {
      setAutosaveState("saving");
      fetch(AUTOSAVE_ENDPOINT, { body: JSON.stringify(values), headers: { "Content-Type": "application/json" }, method: "PUT", signal: abortController.signal })
        .then((response) => { if (!response.ok) throw new Error(`Failed to save EventChip design: ${response.status}`); setAutosaveState("saved"); })
        .catch((error: unknown) => { if (error instanceof DOMException && error.name === "AbortError") return; setAutosaveState("failed"); });
    }, AUTOSAVE_DELAY_MS);

    return () => { abortController.abort(); window.clearTimeout(timer); };
  }, [values]);

  const updateValue = <Key extends keyof EventChipEditorValues>(key: Key, value: EventChipEditorValues[Key]) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
    setAutosaveState("idle");
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-sm"><p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-sky-500">EventChip Sandbox</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950">EventChip design editor</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">変更は dev server 経由で src/chip/eventchip/eventChipDesign.generated.ts に自動保存され、実 EventChip がその値を読みます。</p></div><span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[12px] font-semibold text-slate-600">{autosaveState === "saving" ? "Saving..." : autosaveState === "saved" ? "Saved to source" : autosaveState === "failed" ? "Save failed" : "Autosave ready"}</span></div></section>
        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-48px)] xl:overflow-auto xl:pr-1">
            <section className={CONTROL_PANEL_CLASS_NAME}><h2 className="text-sm font-bold text-slate-900">Color</h2><div className="mt-4 grid gap-4"><label className="flex flex-col gap-2"><span className={CONTROL_LABEL_CLASS_NAME}>Preview accent color</span><input className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700" value={values.accentColor} onChange={(event) => updateValue("accentColor", event.target.value)} /></label><NumberControl label="Background alpha" min={0.04} max={0.5} step={0.01} unit="" value={values.backgroundAlpha} onChange={(value) => updateValue("backgroundAlpha", value)} /></div></section>
            <section className={CONTROL_PANEL_CLASS_NAME}><h2 className="text-sm font-bold text-slate-900">Month</h2><div className="mt-4 grid gap-4"><NumberControl label="Height" min={12} max={34} step={0.1} value={values.monthHeight} onChange={(value) => updateValue("monthHeight", value)} /><NumberControl label="Gap" min={0} max={10} step={0.5} value={values.monthGap} onChange={(value) => updateValue("monthGap", value)} /><NumberControl label="Radius" min={0} max={14} value={values.monthRadius} onChange={(value) => updateValue("monthRadius", value)} /><NumberControl label="Left border" min={0} max={8} value={values.monthBorderWidth} onChange={(value) => updateValue("monthBorderWidth", value)} /><NumberControl label="Padding left" min={0} max={12} value={values.monthPaddingLeft} onChange={(value) => updateValue("monthPaddingLeft", value)} /><NumberControl label="Padding right" min={0} max={12} value={values.monthPaddingRight} onChange={(value) => updateValue("monthPaddingRight", value)} /><NumberControl label="Padding Y time" min={0} max={8} value={values.monthPaddingYWithTime} onChange={(value) => updateValue("monthPaddingYWithTime", value)} /><NumberControl label="Padding Y compact" min={0} max={8} value={values.monthPaddingYCompact} onChange={(value) => updateValue("monthPaddingYCompact", value)} /><NumberControl label="All day offset" min={-4} max={6} value={values.monthAllDayOffset} onChange={(value) => updateValue("monthAllDayOffset", value)} /><NumberControl label="Title font" min={8} max={16} value={values.monthTitleFontSize} onChange={(value) => updateValue("monthTitleFontSize", value)} /><NumberControl label="Time font" min={7} max={14} value={values.monthTimeFontSize} onChange={(value) => updateValue("monthTimeFontSize", value)} /></div></section>
            <section className={CONTROL_PANEL_CLASS_NAME}><h2 className="text-sm font-bold text-slate-900">Weekday</h2><div className="mt-4 grid gap-4"><NumberControl label="Preview height" min={20} max={140} value={values.weekdayHeight} onChange={(value) => updateValue("weekdayHeight", value)} /><NumberControl label="Radius" min={0} max={18} value={values.weekdayRadius} onChange={(value) => updateValue("weekdayRadius", value)} /><NumberControl label="Left border" min={0} max={8} value={values.weekdayBorderWidth} onChange={(value) => updateValue("weekdayBorderWidth", value)} /><NumberControl label="Padding left" min={0} max={14} value={values.weekdayPaddingLeft} onChange={(value) => updateValue("weekdayPaddingLeft", value)} /><NumberControl label="Padding right" min={0} max={14} value={values.weekdayPaddingRight} onChange={(value) => updateValue("weekdayPaddingRight", value)} /><NumberControl label="Padding Y" min={0} max={10} value={values.weekdayPaddingY} onChange={(value) => updateValue("weekdayPaddingY", value)} /><NumberControl label="Inline Padding Y" min={0} max={10} value={values.weekdayInlinePaddingY} onChange={(value) => updateValue("weekdayInlinePaddingY", value)} /><NumberControl label="Gap" min={0} max={6} step={0.5} value={values.weekdayGap} onChange={(value) => updateValue("weekdayGap", value)} /><NumberControl label="Title font" min={8} max={18} value={values.weekdayTitleFontSize} onChange={(value) => updateValue("weekdayTitleFontSize", value)} /><NumberControl label="Title line-height" min={10} max={26} value={values.weekdayTitleLineHeight} onChange={(value) => updateValue("weekdayTitleLineHeight", value)} /><NumberControl label="Time font" min={8} max={16} value={values.weekdayTimeFontSize} onChange={(value) => updateValue("weekdayTimeFontSize", value)} /><NumberControl label="Time line-height" min={10} max={24} value={values.weekdayTimeLineHeight} onChange={(value) => updateValue("weekdayTimeLineHeight", value)} /></div></section>
            <section className={CONTROL_PANEL_CLASS_NAME}><h2 className="text-sm font-bold text-slate-900">List / Tooltip</h2><div className="mt-4 grid gap-4"><NumberControl label="List row" min={32} max={80} value={values.listRowHeight} onChange={(value) => updateValue("listRowHeight", value)} /><NumberControl label="List chip" min={24} max={70} value={values.listChipHeight} onChange={(value) => updateValue("listChipHeight", value)} /><NumberControl label="All day row" min={24} max={60} value={values.listAllDayRowHeight} onChange={(value) => updateValue("listAllDayRowHeight", value)} /><NumberControl label="All day chip" min={18} max={50} value={values.listAllDayChipHeight} onChange={(value) => updateValue("listAllDayChipHeight", value)} /><NumberControl label="List radius" min={0} max={18} value={values.listRadius} onChange={(value) => updateValue("listRadius", value)} /><NumberControl label="List left border" min={0} max={8} value={values.listBorderWidth} onChange={(value) => updateValue("listBorderWidth", value)} /><NumberControl label="List title font" min={8} max={16} value={values.listTitleFontSize} onChange={(value) => updateValue("listTitleFontSize", value)} /><NumberControl label="List time font" min={8} max={16} value={values.listTimeFontSize} onChange={(value) => updateValue("listTimeFontSize", value)} /><NumberControl label="List title gap" min={0} max={8} step={0.5} value={values.listTitleGap} onChange={(value) => updateValue("listTitleGap", value)} /><NumberControl label="Month tooltip radius" min={0} max={24} value={values.tooltipMonthRadius} onChange={(value) => updateValue("tooltipMonthRadius", value)} /><NumberControl label="Weekday tooltip radius" min={0} max={28} value={values.tooltipWeekdayRadius} onChange={(value) => updateValue("tooltipWeekdayRadius", value)} /></div></section>
          </aside>
          <main className="grid gap-5"><div className="grid gap-5 lg:grid-cols-2"><MonthPreview values={values} tokens={tokens} /><WeekdayPreview values={values} tokens={tokens} /></div><div className="grid gap-5 lg:grid-cols-2"><ListPreview values={values} tokens={tokens} /><section className={PREVIEW_CARD_CLASS_NAME}><h2 className="text-base font-semibold text-slate-900">Generated source values</h2><textarea className="mt-4 h-80 w-full resize-none rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-[12px] leading-5 text-slate-100 outline-none" readOnly value={designJson} /></section></div></main>
        </div>
      </div>
    </div>
  );
};

export { EventChipEditorSandboxPage };
