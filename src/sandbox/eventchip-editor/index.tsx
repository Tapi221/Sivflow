import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

type WeekdayLayoutMode = "stacked" | "inline" | "last-line";

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
  weekdayLayoutMode: WeekdayLayoutMode;
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

type RgbColor = {
  red: number;
  green: number;
  blue: number;
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

type SelectControlProps = {
  label: string;
  value: WeekdayLayoutMode;
  options: readonly { value: WeekdayLayoutMode; label: string }[];
  onChange: (value: WeekdayLayoutMode) => void;
};

type PreviewTokens = {
  accent: string;
  background: string;
  text: string;
};

type PreviewProps = {
  values: EventChipEditorValues;
  tokens: PreviewTokens;
};

const DEFAULT_EDITOR_VALUES: EventChipEditorValues = {
  accentColor: "#2f9f6b",
  backgroundAlpha: 0.16,
  monthHeight: 18.3,
  monthRadius: 4,
  monthBorderWidth: 3,
  monthPaddingLeft: 3,
  monthPaddingRight: 2,
  monthPaddingYWithTime: 1,
  monthPaddingYCompact: 2,
  monthTitleFontSize: 11,
  monthTimeFontSize: 9,
  monthGap: 3,
  monthAllDayOffset: 1,
  weekdayHeight: 72,
  weekdayRadius: 6,
  weekdayBorderWidth: 3,
  weekdayPaddingLeft: 4,
  weekdayPaddingRight: 1,
  weekdayPaddingY: 2,
  weekdayInlinePaddingY: 1,
  weekdayGap: 0.5,
  weekdayTitleFontSize: 12,
  weekdayTitleLineHeight: 17,
  weekdayTimeFontSize: 11,
  weekdayTimeLineHeight: 16,
  weekdayLayoutMode: "stacked",
  listRowHeight: 52,
  listChipHeight: 46,
  listAllDayRowHeight: 34,
  listAllDayChipHeight: 28,
  listRadius: 6,
  listBorderWidth: 3,
  listTitleFontSize: 11,
  listTimeFontSize: 11,
  listTitleGap: 0.5,
  tooltipMonthRadius: 10,
  tooltipWeekdayRadius: 14,
};
const WEEKDAY_LAYOUT_OPTIONS: readonly { value: WeekdayLayoutMode; label: string }[] = [
  { value: "stacked", label: "タイトル下に時刻" },
  { value: "inline", label: "タイトル横に時刻" },
  { value: "last-line", label: "最終行に時刻" },
];
const CONTROL_PANEL_CLASS_NAME = "rounded-3xl border border-slate-200 bg-white/92 p-5 shadow-sm";
const CONTROL_LABEL_CLASS_NAME = "text-[12px] font-semibold text-slate-600";
const CONTROL_INPUT_CLASS_NAME = "h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-[12px] font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
const PREVIEW_CARD_CLASS_NAME = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
const SAMPLE_TITLE = "講義・波動復習";
const SAMPLE_TIME_LABEL = "17:07 ~ 19:14";
const SAMPLE_ALL_DAY_TITLE = "燃えないごみ";
const SAMPLE_ALL_DAY_LABEL = "終日";

const clampChannel = (value: number): number => Math.max(0, Math.min(255, value));

const normalizeHexColor = (hex: string): string | null => {
  const value = hex.trim();
  const shortMatch = /^#?([0-9a-fA-F]{3})$/.exec(value);

  if (shortMatch) {
    return `#${shortMatch[1].split("").map((channel) => channel + channel).join("").toUpperCase()}`;
  }

  const longMatch = /^#?([0-9a-fA-F]{6})$/.exec(value);

  return longMatch ? `#${longMatch[1].toUpperCase()}` : null;
};

const hexToRgb = (hex: string): RgbColor | null => {
  const normalizedHex = normalizeHexColor(hex);
  if (!normalizedHex) return null;

  return {
    red: Number.parseInt(normalizedHex.slice(1, 3), 16),
    green: Number.parseInt(normalizedHex.slice(3, 5), 16),
    blue: Number.parseInt(normalizedHex.slice(5, 7), 16),
  };
};

const createRgbaColor = (hex: string, alpha: number): string | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  return `rgba(${clampChannel(rgb.red)}, ${clampChannel(rgb.green)}, ${clampChannel(rgb.blue)}, ${alpha})`;
};

const createPreviewTokens = (values: EventChipEditorValues): PreviewTokens => {
  const colorTokens = generateColorTokens(values.accentColor);

  return {
    accent: colorTokens.border,
    background: createRgbaColor(values.accentColor, values.backgroundAlpha) ?? colorTokens.bg,
    text: colorTokens.text,
  };
};

const createEventChipBaseStyle = (tokens: PreviewTokens, borderWidth: number, radius: number): CSSProperties => ({
  background: tokens.background,
  borderLeft: `${borderWidth}px solid ${tokens.accent}`,
  borderRadius: radius,
  color: tokens.text,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
});

const formatEditorJson = (values: EventChipEditorValues): string => JSON.stringify(values, null, 2);

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

const SelectControl = ({ label, value, options, onChange }: SelectControlProps) => {
  return (
    <label className="flex flex-col gap-2">
      <span className={CONTROL_LABEL_CLASS_NAME}>{label}</span>
      <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" value={value} onChange={(event) => onChange(event.target.value as WeekdayLayoutMode)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
};

const MonthPreview = ({ values, tokens }: PreviewProps) => {
  const chipStyle: CSSProperties = {
    ...createEventChipBaseStyle(tokens, values.monthBorderWidth, values.monthRadius),
    alignItems: "center",
    display: "flex",
    height: values.monthHeight,
    minWidth: 0,
    overflow: "hidden",
    paddingBottom: values.monthPaddingYWithTime,
    paddingLeft: values.monthPaddingLeft,
    paddingRight: values.monthPaddingRight,
    paddingTop: values.monthPaddingYWithTime,
    width: "100%",
  };
  const allDayChipStyle: CSSProperties = {
    ...chipStyle,
    paddingBottom: values.monthPaddingYCompact,
    paddingTop: values.monthPaddingYCompact,
    transform: `translateY(${values.monthAllDayOffset}px)`,
  };

  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Month</p>
          <h2 className="text-base font-semibold text-slate-900">月表示チップ</h2>
        </div>
        <span className="text-[11px] font-medium text-slate-400">top 32px / gap {values.monthGap}px</span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative h-[156px] overflow-hidden rounded-xl border border-slate-100 bg-white">
          <div className="absolute left-3 top-1 flex h-7 items-center gap-1 text-[13px] font-bold text-slate-900">8 <span className="text-[12px] font-semibold text-slate-400">6月</span></div>
          <div className="absolute inset-x-px top-8 flex flex-col" style={{ gap: values.monthGap }}>
            <div style={chipStyle}>
              <span style={{ flex: 1, fontSize: values.monthTitleFontSize, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SAMPLE_TITLE}</span>
              <span style={{ flexShrink: 0, fontSize: values.monthTimeFontSize, fontWeight: 600, lineHeight: 1, marginLeft: 4, opacity: 0.8, whiteSpace: "nowrap" }}>{SAMPLE_TIME_LABEL}</span>
            </div>
            <div style={allDayChipStyle}>
              <span style={{ flex: 1, fontSize: values.monthTitleFontSize, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SAMPLE_ALL_DAY_TITLE}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const WeekdayPreview = ({ values, tokens }: PreviewProps) => {
  const isInline = values.weekdayLayoutMode === "inline";
  const chipStyle: CSSProperties = {
    ...createEventChipBaseStyle(tokens, values.weekdayBorderWidth, values.weekdayRadius),
    display: "flex",
    flexDirection: "column",
    gap: isInline ? 0 : values.weekdayGap,
    height: values.weekdayHeight,
    minHeight: 0,
    overflow: "hidden",
    paddingBottom: isInline ? values.weekdayInlinePaddingY : values.weekdayPaddingY,
    paddingLeft: values.weekdayPaddingLeft,
    paddingRight: values.weekdayPaddingRight,
    paddingTop: isInline ? values.weekdayInlinePaddingY : values.weekdayPaddingY,
    width: "100%",
  };
  const titleStyle: CSSProperties = {
    fontSize: values.weekdayTitleFontSize,
    fontWeight: 500,
    lineHeight: `${values.weekdayTitleLineHeight}px`,
    minWidth: 0,
    overflow: "hidden",
  };
  const timeStyle: CSSProperties = {
    fontSize: values.weekdayTimeFontSize,
    fontWeight: 600,
    lineHeight: `${values.weekdayTimeLineHeight}px`,
    opacity: 0.8,
    whiteSpace: "nowrap",
  };

  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Weekday</p>
          <h2 className="text-base font-semibold text-slate-900">週/日時間グリッド</h2>
        </div>
        <span className="text-[11px] font-medium text-slate-400">line mask + z-10</span>
      </div>
      <div className="grid grid-cols-[48px_minmax(0,1fr)] rounded-2xl border border-slate-200 bg-white">
        <div className="relative border-r border-slate-100 bg-white p-2 text-right text-[11px] font-medium text-slate-400">17:00</div>
        <div className="relative min-h-[180px] bg-white">
          <div className="h-[72px] border-b border-slate-100" />
          <div className="h-[72px] border-b border-slate-100" />
          <div className="absolute left-1 right-1 top-6">
            <div className="relative isolate w-full">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white" style={{ borderRadius: values.weekdayRadius }} />
              <div style={chipStyle}>
                {values.weekdayLayoutMode === "inline" ? (
                  <div className="flex min-w-0 items-baseline gap-1 overflow-hidden">
                    <span style={{ ...titleStyle, flex: 1, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SAMPLE_TITLE}</span>
                    <span style={timeStyle}>{SAMPLE_TIME_LABEL}</span>
                  </div>
                ) : values.weekdayLayoutMode === "last-line" ? (
                  <span style={{ ...titleStyle, display: "block", whiteSpace: "normal" }}>
                    {SAMPLE_TITLE}
                    <span style={{ ...timeStyle, display: "inline-block", marginLeft: 4 }}>{SAMPLE_TIME_LABEL}</span>
                  </span>
                ) : (
                  <>
                    <span style={{ ...titleStyle, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SAMPLE_TITLE}</span>
                    <span style={timeStyle}>{SAMPLE_TIME_LABEL}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ListPreview = ({ values, tokens }: PreviewProps) => {
  const chipStyle: CSSProperties = {
    ...createEventChipBaseStyle(tokens, values.listBorderWidth, values.listRadius),
    height: values.listChipHeight,
    overflow: "hidden",
    padding: "2px 8px 2px 6px",
    textAlign: "left",
    width: "100%",
  };
  const allDayChipStyle: CSSProperties = {
    ...chipStyle,
    alignItems: "center",
    borderLeft: "none",
    display: "flex",
    height: values.listAllDayChipHeight,
    paddingBottom: 0,
    paddingTop: 0,
  };

  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">List</p>
          <h2 className="text-base font-semibold text-slate-900">リスト表示</h2>
        </div>
        <span className="text-[11px] font-medium text-slate-400">54px / 26px / 1fr</span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-[54px_26px_minmax(0,1fr)] items-stretch" style={{ height: values.listRowHeight }}>
          <div className="justify-self-end bg-white px-1 pt-2.5 text-right text-[11px] font-medium tabular-nums text-slate-400">17:07</div>
          <div className="relative flex justify-center">
            <span aria-hidden="true" className="absolute -bottom-1.5 top-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" />
            <span aria-hidden="true" className="relative mt-2 h-2 w-2 rounded-full border-2 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]" style={{ borderColor: tokens.accent, boxShadow: `0 0 0 3px ${tokens.background}` }} />
          </div>
          <div style={chipStyle}>
            <div style={{ fontSize: values.listTimeFontSize, fontWeight: 600, opacity: 0.8, whiteSpace: "nowrap" }}>17:07 - 19:14（2時間7分）</div>
            <div style={{ fontSize: values.listTitleFontSize, fontWeight: 600, lineHeight: 1.375, marginTop: values.listTitleGap, overflow: "hidden" }}>{SAMPLE_TITLE}</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-[54px_26px_minmax(0,1fr)] items-stretch" style={{ height: values.listAllDayRowHeight }}>
          <div className="justify-self-end bg-white px-1 pt-2.5 text-right text-[11px] font-medium text-slate-400">終日</div>
          <div className="relative flex justify-center">
            <span aria-hidden="true" className="absolute -bottom-1.5 top-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" />
            <span aria-hidden="true" className="relative mt-2 h-2 w-2 rounded-full border-2 bg-white" style={{ borderColor: tokens.accent, boxShadow: `0 0 0 3px ${tokens.background}` }} />
          </div>
          <div style={allDayChipStyle}>
            <div style={{ fontSize: values.listTitleFontSize, fontWeight: 600, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SAMPLE_ALL_DAY_TITLE}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TooltipPreview = ({ values, tokens }: PreviewProps) => {
  return (
    <section className={PREVIEW_CARD_CLASS_NAME}>
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Tooltip</p>
        <h2 className="text-base font-semibold text-slate-900">hover tooltip</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="w-fit max-w-[220px] border border-[#dceefa]/80 bg-[#f8fcff]/95 px-2.5 py-1.5 text-[#48616f] shadow-[0_8px_18px_rgba(92,128,154,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl" style={{ borderRadius: values.tooltipMonthRadius }}>
          <span className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tokens.accent }} />
            <span className="block min-w-0 text-[11px] font-semibold leading-snug tracking-[-0.01em] text-[#3f5968]">{SAMPLE_TITLE}</span>
          </span>
          <span className="mt-1 inline-flex w-fit rounded-full border border-white/80 bg-white/75 px-1.5 py-[2px] text-[9px] font-semibold leading-none tabular-nums text-[#6d8998]">{SAMPLE_TIME_LABEL}</span>
        </div>
        <div className="relative flex max-w-[260px] flex-col gap-1.5 overflow-visible border border-white/70 bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-[#46515f] shadow-[0_14px_34px_rgba(74,90,110,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl" style={{ borderRadius: values.tooltipWeekdayRadius }}>
          <div className="flex min-w-0 items-start gap-2">
            <span aria-hidden="true" className="mt-[5px] h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.72)]" style={{ background: tokens.accent }} />
            <span className="min-w-0 flex-1">
              <span className="block break-words text-[12px] font-semibold leading-snug tracking-[-0.01em] text-[#405162]">{SAMPLE_TITLE}</span>
              <span className="mt-1 inline-flex rounded-full bg-[#f2f7fb]/90 px-2 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-[#6b8294]">{SAMPLE_TIME_LABEL}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

const EventChipEditorSandboxPage = () => {
  const [values, setValues] = useState<EventChipEditorValues>(DEFAULT_EDITOR_VALUES);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const tokens = useMemo(() => createPreviewTokens(values), [values]);
  const designJson = useMemo(() => formatEditorJson(values), [values]);

  const updateValue = <Key extends keyof EventChipEditorValues>(key: Key, value: EventChipEditorValues[Key]) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
    setCopyState("idle");
  };

  const copyDesignJson = async () => {
    try {
      await navigator.clipboard.writeText(designJson);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white/92 p-6 shadow-sm">
          <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-sky-500">EventChip Sandbox</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950">EventChip design editor</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">月表示、週/日時間グリッド、リスト表示の EventChip 見た目を同じ画面で調整する sandbox です。初期値は現実装の寸法に合わせています。</p>
            </div>
            <a className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[12px] font-semibold text-slate-600" href="/sandbox/calendar-dnd">Calendar DnD sandbox</a>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-48px)] xl:overflow-auto xl:pr-1">
            <section className={CONTROL_PANEL_CLASS_NAME}>
              <h2 className="text-sm font-bold text-slate-900">Color</h2>
              <div className="mt-4 grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className={CONTROL_LABEL_CLASS_NAME}>Accent color</span>
                  <div className="grid grid-cols-[44px_1fr] gap-3">
                    <input className="h-10 w-11 rounded-lg border border-slate-200 bg-white p-1" type="color" value={values.accentColor} onChange={(event) => updateValue("accentColor", event.target.value)} />
                    <input className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" value={values.accentColor} onChange={(event) => updateValue("accentColor", event.target.value)} />
                  </div>
                </label>
                <NumberControl label="Background alpha" min={0.04} max={0.5} step={0.01} unit="" value={values.backgroundAlpha} onChange={(value) => updateValue("backgroundAlpha", value)} />
              </div>
            </section>

            <section className={CONTROL_PANEL_CLASS_NAME}>
              <h2 className="text-sm font-bold text-slate-900">Month chip</h2>
              <div className="mt-4 grid gap-4">
                <NumberControl label="Height" min={12} max={34} step={0.1} value={values.monthHeight} onChange={(value) => updateValue("monthHeight", value)} />
                <NumberControl label="Gap" min={0} max={10} step={0.5} value={values.monthGap} onChange={(value) => updateValue("monthGap", value)} />
                <NumberControl label="Radius" min={0} max={14} value={values.monthRadius} onChange={(value) => updateValue("monthRadius", value)} />
                <NumberControl label="Left border" min={0} max={8} value={values.monthBorderWidth} onChange={(value) => updateValue("monthBorderWidth", value)} />
                <NumberControl label="Padding left" min={0} max={12} value={values.monthPaddingLeft} onChange={(value) => updateValue("monthPaddingLeft", value)} />
                <NumberControl label="Padding right" min={0} max={12} value={values.monthPaddingRight} onChange={(value) => updateValue("monthPaddingRight", value)} />
                <NumberControl label="Padding Y with time" min={0} max={8} value={values.monthPaddingYWithTime} onChange={(value) => updateValue("monthPaddingYWithTime", value)} />
                <NumberControl label="Padding Y compact" min={0} max={8} value={values.monthPaddingYCompact} onChange={(value) => updateValue("monthPaddingYCompact", value)} />
                <NumberControl label="All day offset" min={-4} max={6} value={values.monthAllDayOffset} onChange={(value) => updateValue("monthAllDayOffset", value)} />
                <NumberControl label="Title font" min={8} max={16} value={values.monthTitleFontSize} onChange={(value) => updateValue("monthTitleFontSize", value)} />
                <NumberControl label="Time font" min={7} max={14} value={values.monthTimeFontSize} onChange={(value) => updateValue("monthTimeFontSize", value)} />
              </div>
            </section>

            <section className={CONTROL_PANEL_CLASS_NAME}>
              <h2 className="text-sm font-bold text-slate-900">Weekday chip</h2>
              <div className="mt-4 grid gap-4">
                <SelectControl label="Layout mode" value={values.weekdayLayoutMode} options={WEEKDAY_LAYOUT_OPTIONS} onChange={(value) => updateValue("weekdayLayoutMode", value)} />
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
                <NumberControl label="List row height" min={32} max={80} value={values.listRowHeight} onChange={(value) => updateValue("listRowHeight", value)} />
                <NumberControl label="List chip height" min={24} max={70} value={values.listChipHeight} onChange={(value) => updateValue("listChipHeight", value)} />
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
            <div className="grid gap-5 lg:grid-cols-2">
              <MonthPreview values={values} tokens={tokens} />
              <WeekdayPreview values={values} tokens={tokens} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <ListPreview values={values} tokens={tokens} />
              <TooltipPreview values={values} tokens={tokens} />
            </div>
            <section className={PREVIEW_CARD_CLASS_NAME}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Output</p>
                  <h2 className="text-base font-semibold text-slate-900">調整値 JSON</h2>
                </div>
                <button className="rounded-full bg-slate-950 px-4 py-2 text-[12px] font-semibold text-white" type="button" onClick={copyDesignJson}>{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy JSON"}</button>
              </div>
              <textarea className="h-80 w-full resize-none rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-[12px] leading-5 text-slate-100 outline-none" readOnly value={designJson} />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export { EventChipEditorSandboxPage };
