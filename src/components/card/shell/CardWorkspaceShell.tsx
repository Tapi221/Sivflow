import { CardPaneWidthAdjuster } from "@/features/cardsetview/hooks/components/CardPaneWidthAdjuster";
import { cn } from "@/lib/utils";
import { X } from "@/ui/icons";
import type { CSSProperties, ReactNode, Ref } from "react";

export type CardWorkspaceSurfaceVariant = "plain" | "dotted";

const WORKSPACE_SURFACE_CLASS_NAMES: Record<
  CardWorkspaceSurfaceVariant,
  string
> = {
  plain: "workspace-surface--plain",
  dotted: "workspace-surface--dotted",
};

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

const MetaPanelToggleGlyph = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="4.5" />
      <path d="M8 8.25v7.5" />
    </svg>
  );
};

export type CardWorkspaceShellProps = {
  children: ReactNode;
  containerClassName?: string;
  shellClassName?: string;
  contentAreaClassName?: string;
  viewportClassName?: string;
  viewportStyle?: CSSProperties;
  surfaceVariant?: CardWorkspaceSurfaceVariant;
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
  surfaceVariant = "plain",
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

  const topControlsOffsetPx = overlayTopInsetPx + 8;

  const surfaceClassName = WORKSPACE_SURFACE_CLASS_NAMES[surfaceVariant];

  return (
    <div className={cn(surfaceClassName, containerClassName)}>
      <div
        className={cn(
          "relative flex h-full min-h-0 overflow-hidden",
          shellClassName,
        )}
      >
        {topLeftControl || widthControl || showMetaToggle ? (
          <div
            className="pointer-events-none absolute left-3 z-30 flex items-center gap-2"
            style={{ top: `${topControlsOffsetPx}px` }}
          >
            {topLeftControl ? (
              <div className="pointer-events-auto flex">{topLeftControl}</div>
            ) : null}

            {widthControl ? (
              <div
                className={cn(
                  "pointer-events-auto flex",
                  widthControlClassName,
                )}
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

            {showMetaToggle ? (
              <button
                type="button"
                className={cn(
                  "pointer-events-auto grid h-10 w-10 place-items-center rounded-[12px] border border-[rgba(203,213,225,0.96)] bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,0.96)_100%)] text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-[10px] transition-colors duration-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,0.98)_100%)] hover:text-slate-900",
                  isMetaOpen &&
                    "border-[rgba(148,163,184,0.96)] bg-[linear-gradient(180deg,rgba(226,232,240,0.98)_0%,rgba(203,213,225,0.96)_100%)] text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.96)]",
                  metaToggleClassName,
                )}
                onClick={onToggleMetaOpen}
                aria-label={isMetaOpen ? labels.close : labels.open}
                aria-pressed={isMetaOpen}
              >
                {isMetaOpen ? (
                  <X className="h-[18px] w-[18px]" />
                ) : (
                  <MetaPanelToggleGlyph className="h-[18px] w-[18px]" />
                )}
              </button>
            ) : null}
          </div>
        ) : null}

        {overlayChildren}

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
