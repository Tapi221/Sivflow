import { CardPaneWidthAdjuster } from "@/features/cardsetview/hooks/components/CardPaneWidthAdjuster";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { overlayGlassIconButtonClassName } from "@/components/card/shell/overlaySurfaceClassNames";
import type { CSSProperties, ReactNode, Ref } from "react";

export type CardWorkspaceWidthControlProps = {
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
};

type MetaToggleLabels = {
  open: string;
  close: string;
};

const DEFAULT_META_TOGGLE_LABELS: MetaToggleLabels = {
  open: "open meta panel",
  close: "close meta panel",
};

export type CardWorkspaceShellProps = {
  children: ReactNode;
  containerClassName?: string;
  shellClassName?: string;
  contentAreaClassName?: string;
  viewportClassName?: string;
  viewportStyle?: CSSProperties;
  viewportRef?: Ref<HTMLDivElement>;
  widthControl?: CardWorkspaceWidthControlProps | null;
  widthControlClassName?: string;
  topLeftControl?: ReactNode;
  overlayChildren?: ReactNode;
  overlayTopInsetPx?: number;
  isMetaOpen: boolean;
  onToggleMetaOpen?: () => void;
  hideMetaToggle?: boolean;
  metaToggleClassName?: string;
  metaToggleLabels?: Partial<MetaToggleLabels>;
  metaPanel?: ReactNode;
  metaPanelContainerClassName?: string;
};

export const CardWorkspaceShell = ({
  children,
  containerClassName,
  shellClassName,
  contentAreaClassName,
  viewportClassName,
  viewportStyle,
  viewportRef,
  widthControl = null,
  widthControlClassName,
  topLeftControl,
  overlayChildren,
  overlayTopInsetPx = 0,
  isMetaOpen,
  onToggleMetaOpen,
  hideMetaToggle = false,
  metaToggleClassName,
  metaToggleLabels,
  metaPanel,
  metaPanelContainerClassName,
}: CardWorkspaceShellProps) => {
  const labels = {
    ...DEFAULT_META_TOGGLE_LABELS,
    ...metaToggleLabels,
  };

  const showMetaToggle =
    !hideMetaToggle && typeof onToggleMetaOpen === "function";

  const topLeftOffsetPx = overlayTopInsetPx + 8;
  const topRightOffsetPx = overlayTopInsetPx + 12;

  return (
    <div className={cn(containerClassName)}>
      <div
        className={cn(
          "relative flex h-full min-h-0 overflow-hidden",
          shellClassName,
        )}
      >
        {topLeftControl ? (
          <div
            className="pointer-events-auto absolute left-3 z-30 flex"
            style={{ top: `${topLeftOffsetPx}px` }}
          >
            {topLeftControl}
          </div>
        ) : null}

        {widthControl ? (
          <div
            className={cn(
              "pointer-events-auto absolute left-3 z-30 flex",
              widthControlClassName,
            )}
            style={{ top: `${topLeftOffsetPx}px` }}
          >
            <CardPaneWidthAdjuster
              modeLabel={widthControl.modeLabel}
              value={widthControl.value}
              min={widthControl.min}
              max={widthControl.max}
              defaultValue={widthControl.defaultValue}
              onPreviewChange={widthControl.onPreviewChange}
              onCommit={widthControl.onCommit}
              onStepDown={widthControl.onStepDown}
              onStepUp={widthControl.onStepUp}
              onReset={widthControl.onReset}
            />
          </div>
        ) : null}

        {overlayChildren}

        {showMetaToggle ? (
          <button
            type="button"
            className={cn(
              "absolute z-20",
              overlayGlassIconButtonClassName,
              metaToggleClassName,
            )}
            style={{
              top: `${topRightOffsetPx}px`,
              right: isMetaOpen
                ? "calc(var(--ui-panel-width) - var(--ui-space-3))"
                : "var(--ui-space-1)",
              transform: "none",
            }}
            onClick={onToggleMetaOpen}
            aria-label={isMetaOpen ? labels.close : labels.open}
          >
            {isMetaOpen ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            contentAreaClassName,
          )}
        >
          <div
            ref={viewportRef}
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-hidden",
              viewportClassName,
            )}
            style={viewportStyle}
          >
            {children}
          </div>
        </div>

        {isMetaOpen && metaPanel ? (
          <div
            className={cn(
              "hidden h-full min-h-0 shrink-0 md:block",
              metaPanelContainerClassName,
            )}
          >
            {metaPanel}
          </div>
        ) : null}
      </div>
    </div>
  );
};
