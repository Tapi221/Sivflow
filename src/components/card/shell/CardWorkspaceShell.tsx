import { CardPaneWidthAdjuster } from "@/features/cardsetview/hooks/components/CardPaneWidthAdjuster";
import { cn } from "@/lib/utils";
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
  topRightControl?: ReactNode;
  overlayChildren?: ReactNode;
  overlayTopInsetPx?: number;
  isMetaOpen: boolean;
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
  topRightControl,
  overlayChildren,
  overlayTopInsetPx = 0,
  isMetaOpen,
  metaPanel,
  metaPanelContainerClassName,
}: CardWorkspaceShellProps) => {
  const topControlsOffsetPx = overlayTopInsetPx + 8;
  const surfaceClassName = WORKSPACE_SURFACE_CLASS_NAMES[surfaceVariant];
  const metaPanelWidth = isMetaOpen ? "var(--ui-panel-width)" : "0px";

  return (
    <div className={cn(surfaceClassName, containerClassName)}>
      <div
        className={cn(
          "relative flex h-full min-h-0 overflow-hidden",
          shellClassName,
        )}
      >
        {topLeftControl || widthControl ? (
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
          </div>
        ) : null}

        {overlayChildren}

        {topRightControl ? (
          <div
            className="pointer-events-auto absolute right-3 z-30 flex"
            style={{ top: `${topControlsOffsetPx}px` }}
          >
            {topRightControl}
          </div>
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

        {metaPanel ? (
          <div
            aria-hidden={!isMetaOpen}
            className={cn(
              "hidden h-full min-h-0 shrink-0 overflow-hidden md:block",
              "transition-[width,opacity] duration-200 ease-out",
              isMetaOpen ? "opacity-100" : "pointer-events-none opacity-0",
              metaPanelContainerClassName,
            )}
            style={{ width: metaPanelWidth }}
          >
            {metaPanel}
          </div>
        ) : null}
      </div>
    </div>
  );
};
