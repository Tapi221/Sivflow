import type { CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";

export type SharedCardContentBaseProps = Readonly<{
  blocks: CardBlock[];
  className?: string;
}>;

export type SharedCardContentViewProps = SharedCardContentBaseProps &
  Readonly<{
    mode: "view";
    onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
    displayMode?: CardDisplayMode;
    zoom?: number;
  }>;

export type SharedCardContentEditProps = SharedCardContentBaseProps &
  Readonly<{
    mode: "edit";
    onChange: (blocks: CardBlock[]) => void;
    prefix: "question" | "answer";
    label: string;
    accentColor?: string;
    duplicateToOpposite?: boolean;
    onCrossDuplicate?: (block: CardBlock) => void;
    autoFocus?: boolean;
    customPlaceholders?: Record<number, string>;
    hideToolbar?: boolean;
    onDelete?: (index: number) => void;
    minDeletableIndex?: number;
    hiddenBlockTypes?: CardBlock["type"][];
    toolbarMount?: HTMLDivElement | null;
    toolbarDesktopLayout?: "horizontal" | "vertical";
    enableBlockSelectionState?: boolean;
    settings?: unknown;
    displayMode?: CardDisplayMode;
    zoom?: number;
  }>;

export type SharedCardContentProps =
  | SharedCardContentViewProps
  | SharedCardContentEditProps;
