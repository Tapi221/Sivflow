import type { ReactNode } from "react";

import {
  overlayGlassActionButtonClassName,
  overlayGlassToolbarClassName,
} from "@/components/card/shell/overlaySurfaceClassNames";
import {
  CARD_LAYOUT_MODE_LABELS,
  type CardLayoutMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import { cn } from "@/lib/utils";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { Circle, Layers } from "@/ui/icons";

type CardModeToolbarProps = {
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  disabledCardLayoutModes?: Partial<Record<CardLayoutMode, boolean>>;
  onChangeDisplayMode: (mode: CardDisplayMode) => void;
  onChangeCardLayoutMode: (mode: CardLayoutMode) => void;
};

type ModeButtonProps = {
  isActive: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
};

const ModeButton = ({
  isActive,
  onClick,
  label,
  disabled = false,
  children,
}: ModeButtonProps) => {
  return (
    <button
      type="button"
      className={cn(
        overlayGlassActionButtonClassName,
        "relative",
        isActive &&
          !disabled &&
          "border-slate-300 bg-white text-slate-900 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]",
        disabled &&
          "border-slate-200/60 bg-white/35 text-slate-300 hover:bg-white/35 hover:text-slate-300",
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      aria-disabled={disabled}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const StackGlyph = () => (
  <div className="flex h-3.5 w-3.5 flex-col justify-between">
    <span className="block h-[3px] rounded-sm bg-current" />
    <span className="block h-[3px] rounded-sm bg-current opacity-80" />
    <span className="block h-[3px] rounded-sm bg-current opacity-60" />
  </div>
);

const FlipGlyph = () => (
  <div className="relative h-3.5 w-3.5">
    <span className="absolute inset-x-0 top-[1px] block h-[5px] rounded-sm border border-current bg-transparent" />
    <span className="absolute inset-x-0 bottom-[1px] block h-[5px] rounded-sm bg-current opacity-75" />
  </div>
);

const SplitGlyph = () => (
  <div className="grid h-3.5 w-3.5 grid-cols-2 gap-[2px]">
    <span className="block rounded-sm bg-current" />
    <span className="block rounded-sm bg-current opacity-75" />
  </div>
);

export const CardModeToolbar = ({
  displayMode,
  cardLayoutMode,
  disabledCardLayoutModes,
  onChangeDisplayMode,
  onChangeCardLayoutMode,
}: CardModeToolbarProps) => {
  return (
    <div className={cn(overlayGlassToolbarClassName, "gap-2 px-2.5")}>
      <div className="flex items-center gap-1">
        <ModeButton
          isActive={displayMode === "fixed"}
          onClick={() => onChangeDisplayMode("fixed")}
          label="カード表示"
        >
          <Circle className="h-3.5 w-3.5" />
        </ModeButton>
        <ModeButton
          isActive={displayMode === "fluid"}
          onClick={() => onChangeDisplayMode("fluid")}
          label="最大表示"
        >
          <Layers className="h-3.5 w-3.5" />
        </ModeButton>
      </div>

      <span className="h-5 w-px bg-slate-200/80" />

      <div className="flex items-center gap-1">
        <ModeButton
          isActive={cardLayoutMode === "stack"}
          onClick={() => onChangeCardLayoutMode("stack")}
          label={CARD_LAYOUT_MODE_LABELS.stack}
          disabled={disabledCardLayoutModes?.stack}
        >
          <StackGlyph />
        </ModeButton>
        <ModeButton
          isActive={cardLayoutMode === "flip"}
          onClick={() => onChangeCardLayoutMode("flip")}
          label={CARD_LAYOUT_MODE_LABELS.flip}
          disabled={disabledCardLayoutModes?.flip}
        >
          <FlipGlyph />
        </ModeButton>
        <ModeButton
          isActive={cardLayoutMode === "split"}
          onClick={() => onChangeCardLayoutMode("split")}
          label={CARD_LAYOUT_MODE_LABELS.split}
          disabled={disabledCardLayoutModes?.split}
        >
          <SplitGlyph />
        </ModeButton>
      </div>
    </div>
  );
};
