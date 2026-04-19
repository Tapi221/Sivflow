import { Slider } from "@/components/ui/slider";
import {
  overlayGlassActionButtonClassName,
  overlayGlassToolbarClassName,
} from "@/components/card/shell/overlaySurfaceClassNames";
import { Minus, Plus } from "@/ui/icons";
import React from "react";

interface CardZoomControlProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (nextValue: number) => void;
  onStepDown: () => void;
  onStepUp: () => void;
}

export const CardZoomControl = ({
  value,
  min,
  max,
  step = 5,
  onChange,
  onStepDown,
  onStepUp,
}: CardZoomControlProps) => {
  const sliderValue = React.useMemo(() => [value], [value]);

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
    <div
      className={overlayGlassToolbarClassName}
      data-card-zoom-input-ignore="true"
    >
      <button
        type="button"
        className={overlayGlassActionButtonClassName}
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
          aria-label="カードズーム"
        />
      </div>

      <div className="min-w-[3.25rem] text-center text-[11px] font-semibold tabular-nums text-[#6b5f55]">
        {value}%
      </div>

      <button
        type="button"
        className={overlayGlassActionButtonClassName}
        onClick={onStepUp}
        disabled={value >= max}
        aria-label="ズームを拡大"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
