import React from "react";

import { Minus, Plus, RefreshCw } from "@/ui/icons";
import { Slider } from "@/components/ui/slider";

const clampPaneWidthPx = (
  value: number | null | undefined,
  min: number,
  max?: number,
) => {
  const fallback = Math.max(1, min);
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const clampedMin = Math.max(1, min);
  const clampedMax =
    typeof max === "number" && Number.isFinite(max)
      ? Math.max(clampedMin, max)
      : Number.POSITIVE_INFINITY;
  return Math.min(clampedMax, Math.max(clampedMin, Math.round(safeValue)));
};

interface CardPaneWidthControlProps {
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

export const CardPaneWidthControl = ({
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
}: CardPaneWidthControlProps) => {
  const resetDisabled = value === defaultValue;
  const controlRootRef = React.useRef<HTMLDivElement | null>(null);
  const suppressOutsideClickUntilRef = React.useRef(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleClickCapture = (event: MouseEvent) => {
      if (Date.now() > suppressOutsideClickUntilRef.current) return;
      const target = event.target;
      if (target instanceof Node && controlRootRef.current?.contains(target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("click", handleClickCapture, true);
    return () => {
      window.removeEventListener("click", handleClickCapture, true);
    };
  }, []);

  const beginInteractionGuard = () => {
    // スライダー操作の pointerup/click が背面のブロック追加ボタンに落ちる誤作動を抑止する。
    suppressOutsideClickUntilRef.current = Date.now() + 250;
  };

  return (
    <div
      ref={controlRootRef}
      className="pointer-events-auto flex items-center gap-1.5 rounded-[20px] border border-slate-200/80 bg-white/82 px-2.5 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
      onPointerDownCapture={beginInteractionGuard}
      onPointerMoveCapture={beginInteractionGuard}
    >
      <div className="min-w-[72px] leading-none">
        <div className="text-[10px] font-medium tracking-[0.06em] text-slate-500">
          {modeLabel}
        </div>
        <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-slate-700">
          {value}px
        </div>
      </div>

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
          value={[value]}
          onValueChange={(next) => {
            const [raw] = next;
            onPreviewChange(clampPaneWidthPx(raw, min, max));
          }}
          onValueCommit={(next) => {
            const [raw] = next;
            onCommit(clampPaneWidthPx(raw, min, max));
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
};
