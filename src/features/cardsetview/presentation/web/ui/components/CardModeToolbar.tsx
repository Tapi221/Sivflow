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
import { BookOpen, Circle, Layers, Pencil } from "@/ui/icons";

type CardModeToolbarProps = {
  interactionMode: "view" | "edit";
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  onChangeInteractionMode: (mode: "view" | "edit") => void;
  onChangeDisplayMode: (mode: CardDisplayMode) => void;
  onChangeCardLayoutMode: (mode: CardLayoutMode) => void;
};

const ModeButton = ({
  isActive,
  onClick,
  label,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) => {
  return (
    <button
      type="button"
      className={cn(
        overlayGlassActionButtonClassName,
        "relative",
        isActive &&
          "border-slate-300 bg-white text-slate-900 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]",
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={isActive}
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
  interactionMode,
  displayMode,
  cardLayoutMode,
  onChangeInteractionMode,
  onChangeDisplayMode,
  onChangeCardLayoutMode,
}: CardModeToolbarProps) => {
  return (
    <div className={cn(overlayGlassToolbarClassName, "gap-2 px-2.5")}>
      <div className="flex items-center gap-1">
        <ModeButton
          isActive={interactionMode === "view"}
          onClick={() => onChangeInteractionMode("view")}
          label="閲覧モード"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </ModeButton>
        <ModeButton
          isActive={interactionMode === "edit"}
          onClick={() => onChangeInteractionMode("edit")}
          label="編集モード"
        >
          <Pencil className="h-3.5 w-3.5" />
        </ModeButton>
      </div>

      <span className="h-5 w-px bg-slate-200/80" />

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
        >
          <StackGlyph />
        </ModeButton>
        <ModeButton
          isActive={cardLayoutMode === "flip"}
          onClick={() => onChangeCardLayoutMode("flip")}
          label={CARD_LAYOUT_MODE_LABELS.flip}
        >
          <FlipGlyph />
        </ModeButton>
        <ModeButton
          isActive={cardLayoutMode === "split"}
          onClick={() => onChangeCardLayoutMode("split")}
          label={CARD_LAYOUT_MODE_LABELS.split}
        >
          <SplitGlyph />
        </ModeButton>
      </div>
    </div>
  );
};
