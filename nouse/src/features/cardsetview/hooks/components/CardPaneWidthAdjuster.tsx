import React from "react";
import { Minus, Plus, RefreshCw } from "@web-renderer/chip/icons";
import { Slider } from "@web-renderer/chip/ui/slider";



interface CardPaneWidthAdjusterProps {
  modeLabel: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  step?: number;
  valueFormatter?: (value: number) => string;
  onPreviewChange: (value: number) => void;
  onCommit: (value: number) => void;
  onStepDown: () => void;
  onStepUp: () => void;
  onReset: () => void;
}



const clampValue = (value: number, min: number, max: number) => {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);

  if (!Number.isFinite(value)) return safeMin;
  return Math.min(safeMax, Math.max(safeMin, value));
};



const CardPaneWidthAdjuster = ({ modeLabel, value, min, max, defaultValue, step = 8, valueFormatter, onPreviewChange, onCommit, onStepDown, onStepUp, onReset }: CardPaneWidthAdjusterProps) => {
  const resetDisabled = value === defaultValue;
  const [draftValue, setDraftValue] = React.useState(value);

  React.useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const formattedValue = valueFormatter ? valueFormatter(draftValue) : null;

  return (
    <div className="surface-glass-base surface-glass-card-pane pointer-events-auto flex items-center gap-1.5 rounded-3xl px-2.5 py-1">
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onStepDown}
        disabled={value <= min}
        aria-label={`${modeLabel}を縮小`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className="w-24 px-0.5">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[draftValue]}
          onValueChange={(next) => {
            const [raw] = next;
            const nextValue = clampValue(raw, min, max);
            setDraftValue(nextValue);
            onPreviewChange(nextValue);
          }}
          onValueCommit={(next) => {
            const [raw] = next;
            const nextValue = clampValue(raw, min, max);
            setDraftValue(nextValue);
            onCommit(nextValue);
          }}
          aria-label={`${modeLabel}スライダー`}
        />
      </div>

      {formattedValue ? (
        <div className="min-w-12 text-center text-xs font-semibold tabular-nums text-slate-500">
          {formattedValue}
        </div>
      ) : null}

      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onStepUp}
        disabled={value >= max}
        aria-label={`${modeLabel}を拡大`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onReset}
        disabled={resetDisabled}
        aria-label={`${modeLabel}を既定値に戻す`}
        title="既定値に戻す"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};



export { CardPaneWidthAdjuster };


export type { CardPaneWidthAdjusterProps };
