import { Slider } from "@/components/ui/slider";
import { Minus, Plus, RefreshCw } from "@/ui/icons";
import React from "react";

interface CardZoomControlProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  onChange: (nextValue: number) => void;
  onStepDown: () => void;
  onStepUp: () => void;
  onReset: () => void;
}

export const CardZoomControl = ({
  value,
  min,
  max,
  step = 5,
  defaultValue,
  onChange,
  onStepDown,
  onStepUp,
  onReset,
}: CardZoomControlProps) => {
  const sliderValue = React.useMemo(() => [value], [value]);
  const resetDisabled = value === defaultValue;

  const handleSliderChange = React.useCallback(
    (next: number[]) => {
      const nextValue = next[0];
      if (typeof nextValue === "number" && Number.isFinite(nextValue)) {
        onChange(nextValue);
      }
    },
    [onChange],
  );

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-[20px] border border-slate-200/80 bg-white/82 px-2.5 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onStepDown}
        disabled={value <= min}
        aria-label="ズームを縮小"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <div className="w-24 px-0.5">
        <Slider
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderChange}
          aria-label="閲覧ズーム"
        />
      </div>

      <div className="min-w-[3.25rem] text-center text-[11px] font-semibold tabular-nums text-slate-600">
        {value}%
      </div>

      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onStepUp}
        disabled={value >= max}
        aria-label="ズームを拡大"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200/70 bg-white/55 text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onReset}
        disabled={resetDisabled}
        aria-label="ズームを既定値に戻す"
        title="既定値に戻す"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
