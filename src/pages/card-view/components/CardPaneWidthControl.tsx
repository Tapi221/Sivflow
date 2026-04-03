import { Slider } from "@/components/ui/slider";
import { Minus, Plus, RefreshCw } from "@/ui/icons";
import { clampPaneWidthPx } from "@/pages/card-view/constants";
import React from "react";

export interface CardPaneWidthControlProps {
  modeLabel: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onPreviewChange: (value: number) => void;
  onCommit: (value: number) => void;
  onStepDown: () => void;
  onStepUp: () => void;
  onReset: () => void;
}

export function CardPaneWidthControl({
  modeLabel,
  value,
  min,
  max,
  defaultValue,
  onPreviewChange,
  onCommit,
  onStepDown,
  onStepUp,
  onReset,
}: CardPaneWidthControlProps) {
  const resetDisabled = value === defaultValue;
  const [draftValue, setDraftValue] = React.useState(value);

  React.useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-[20px] border border-slate-200/80 bg-white/82 px-2.5 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
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
          step={8}
          value={[draftValue]}
          onValueChange={(next) => {
            const [raw] = next;
            setDraftValue(clampPaneWidthPx(raw, min, max));
          }}
          onValueCommit={(next) => {
            const [raw] = next;
            const nextValue = clampPaneWidthPx(raw, min, max);
            setDraftValue(nextValue);
            onCommit(nextValue);
          }}
          aria-label={`${modeLabel}スライダー`}
        />
      </div>

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
}
