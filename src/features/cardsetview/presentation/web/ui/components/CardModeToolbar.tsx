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
          "border-[rgba(214,198,182,0.96)] bg-[rgba(255,252,247,0.98)] text-[#3d342d] shadow-[inset_0_0_0_1px_rgba(107,95,85,0.08)]",
        disabled &&
          "border-[rgba(233,224,216,0.88)] bg-[rgba(255,250,245,0.56)] text-[#baaea4] hover:bg-[rgba(255,250,245,0.56)] hover:text-[#baaea4]",
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

const FixedDisplayGlyph = () => (
  <svg
    viewBox="0 0 16 16"
    className="h-3.5 w-3.5"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="2.75"
      y="2.75"
      width="10.5"
      height="10.5"
      rx="2.25"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.35"
    />
    <rect
      x="4.75"
      y="4"
      width="6.5"
      height="8"
      rx="1.5"
      fill="currentColor"
      opacity="0.9"
    />
  </svg>
);

const FluidDisplayGlyph = () => (
  <svg
    viewBox="0 0 16 16"
    className="h-3.5 w-3.5"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5.25 2.5H2.5v2.75M10.75 2.5h2.75v2.75M13.5 10.75v2.75h-2.75M5.25 13.5H2.5v-2.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="4"
      y="4"
      width="8"
      height="8"
      rx="1.75"
      fill="currentColor"
      opacity="0.9"
    />
  </svg>
);

const StackGlyph = () => (
  <svg
    viewBox="0 0 16 16"
    className="h-3.5 w-3.5"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="3"
      y="2.5"
      width="10"
      height="4.25"
      rx="1.4"
      fill="currentColor"
      opacity="0.92"
    />
    <rect
      x="3"
      y="9.25"
      width="10"
      height="4.25"
      rx="1.4"
      fill="currentColor"
      opacity="0.58"
    />
  </svg>
);

const FlipGlyph = () => (
  <svg
    viewBox="0 0 16 16"
    className="h-3.5 w-3.5"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="2.75"
      y="5"
      width="7"
      height="5.5"
      rx="1.35"
      stroke="currentColor"
      strokeWidth="1.25"
      opacity="0.45"
    />
    <rect
      x="6.25"
      y="2.5"
      width="7"
      height="5.5"
      rx="1.35"
      fill="currentColor"
      opacity="0.9"
    />
    <path
      d="M4.25 12.25c1.15.95 2.55 1.35 4.2 1.35 1.25 0 2.35-.22 3.3-.68"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M11.1 11.65l1.85 1.2-1.95.9"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.7"
    />
  </svg>
);

const SplitGlyph = () => (
  <svg
    viewBox="0 0 16 16"
    className="h-3.5 w-3.5"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="2.5"
      y="2.75"
      width="11"
      height="10.5"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.25"
      opacity="0.32"
    />
    <rect
      x="3.75"
      y="4"
      width="3.75"
      height="8"
      rx="1.2"
      fill="currentColor"
      opacity="0.92"
    />
    <rect
      x="8.5"
      y="4"
      width="3.75"
      height="8"
      rx="1.2"
      fill="currentColor"
      opacity="0.58"
    />
  </svg>
);

export const CardModeToolbar = ({
  displayMode,
  cardLayoutMode,
  disabledCardLayoutModes,
  onChangeDisplayMode,
  onChangeCardLayoutMode,
}: CardModeToolbarProps) => {
  const nextDisplayMode: CardDisplayMode =
    displayMode === "fixed" ? "fluid" : "fixed";
  const displayModeToggleLabel =
    displayMode === "fixed"
      ? "カード表示。タップで最大表示に切り替え"
      : "最大表示。タップでカード表示に切り替え";

  return (
    <div className={cn(overlayGlassToolbarClassName, "gap-2 px-2.5")}>
      <ModeButton
        isActive={displayMode === "fluid"}
        onClick={() => onChangeDisplayMode(nextDisplayMode)}
        label={displayModeToggleLabel}
      >
        {displayMode === "fixed" ? (
          <FixedDisplayGlyph />
        ) : (
          <FluidDisplayGlyph />
        )}
      </ModeButton>

      <span className="h-5 w-px bg-[rgba(218,207,197,0.92)]" />

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
