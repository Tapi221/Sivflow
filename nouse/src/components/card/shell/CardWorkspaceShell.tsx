import { useCallback, useEffect, useRef, useState } from "react";
import { SelectionCaptureGlyph } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarGlyphs";
import { cn } from "@web-renderer/lib/utils";
import type { CSSProperties, ReactNode, Ref } from "react";
import { CardPaneWidthAdjuster } from "@/features/cardsetview/hooks/components/CardPaneWidthAdjuster";
import type { CardSelectionCaptureSide } from "@/features/selection-capture/cardSelectionCaptureEvents";
import { dispatchCardSelectionCaptureEvent } from "@/features/selection-capture/cardSelectionCaptureEvents";
import { copyImageBlobToClipboard } from "@/features/selection-capture/clipboardImage";
import { captureElementRectToBlob } from "@/features/selection-capture/domSelectionCapture";
import type { SelectionCaptureArea, SelectionCaptureRect } from "@/features/selection-capture/selectionCapture.types";
import { recognizeSelectionCaptureText } from "@/features/selection-capture/selectionCaptureOcr";
import { SelectionCaptureOverlay } from "@/features/selection-capture/SelectionCaptureOverlay";



type CardWorkspaceSurfaceVariant = "plain" | "dotted";
type CardWorkspaceCaptureTarget = {
  side: CardSelectionCaptureSide;
  element: HTMLElement;
  area: number;
};
type CardWorkspaceWidthControlProps = {
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
type CardWorkspaceShellProps = {
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
  selectionCaptureEnabled?: boolean;
};



const WORKSPACE_SURFACE_CLASS_NAMES: Record<CardWorkspaceSurfaceVariant, string> = {
  plain: "workspace-surface--plain",
  dotted: "workspace-surface--dotted",
};



const setExternalRef = (ref: Ref<HTMLDivElement> | undefined, node: HTMLDivElement | null): void => {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(node);
    return;
  }
  (ref as { current: HTMLDivElement | null; }).current = node;
};
const getIntersectionArea = (left: DOMRect, right: DOMRect): number => {
  const width = Math.min(left.right, right.right) - Math.max(left.left, right.left);
  const height = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
  return width > 0 && height > 0 ? width * height : 0;
};
const resolveCaptureSide = (target: HTMLElement, rect: SelectionCaptureRect): CardSelectionCaptureSide => {
  const targetBounds = target.getBoundingClientRect();
  const selectionBounds = new DOMRect(targetBounds.left + rect.x, targetBounds.top + rect.y, rect.width, rect.height);
  const candidates: CardWorkspaceCaptureTarget[] = [];
  target.querySelectorAll<HTMLElement>(".js-question-editor, .js-answer-editor").forEach((element) => {
    const area = getIntersectionArea(selectionBounds, element.getBoundingClientRect());
    if (area <= 0) return;
    candidates.push({
      element,
      side: element.classList.contains("js-answer-editor") ? "answer" : "question",
      area,
    });
  });
  candidates.sort((left, right) => right.area - left.area);
  return candidates[0]?.side ?? "question";
};
const resolveTaskMessage = (values: Array<string | void>): string | null => {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
};
const hasRenderableNode = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;



const CardWorkspaceShell = ({ children, containerClassName, shellClassName, contentAreaClassName, viewportClassName, viewportStyle, surfaceVariant = "plain", viewportRef, widthControl = null, widthControlClassName, topLeftControl, topRightControl, overlayChildren, overlayTopInsetPx = 0, isMetaOpen, metaPanel, metaPanelContainerClassName, selectionCaptureEnabled = true }: CardWorkspaceShellProps) => {
  const viewportNodeRef = useRef<HTMLDivElement | null>(null);
  const [isSelectionCaptureActive, setIsSelectionCaptureActive] = useState(false);
  const [isSelectionCaptureBusy, setIsSelectionCaptureBusy] = useState(false);
  const [selectionCaptureMessage, setSelectionCaptureMessage] = useState<string | null>(null);
  const topControlsOffsetPx = overlayTopInsetPx + 8;
  const surfaceClassName = WORKSPACE_SURFACE_CLASS_NAMES[surfaceVariant];
  const metaPanelWidth = isMetaOpen ? "var(--ui-panel-width)" : "0px";
  const setViewportNode = useCallback((node: HTMLDivElement | null) => {
    viewportNodeRef.current = node;
    setExternalRef(viewportRef, node);
  }, [viewportRef]);
  const handleStartSelectionCapture = useCallback(() => {
    setSelectionCaptureMessage(null);
    setIsSelectionCaptureActive((isActive) => !isActive);
  }, []);
  const handleCancelSelectionCapture = useCallback(() => {
    setIsSelectionCaptureActive(false);
    setIsSelectionCaptureBusy(false);
  }, []);
  const handleCaptureSelection = useCallback(async (area: SelectionCaptureArea) => {
    const target = viewportNodeRef.current;
    if (!target) return;
    const rect = area.rect;
    setIsSelectionCaptureBusy(true);
    try {
      const blob = await captureElementRectToBlob(target, rect);
      const ocrText = await recognizeSelectionCaptureText(blob).catch((error) => {
        console.warn("[CardWorkspaceShell] selection capture OCR failed", error);
        return null;
      });
      const side = resolveCaptureSide(target, rect);
      const dispatched = dispatchCardSelectionCaptureEvent({
        blob,
        rect,
        target,
        side,
        ocrText,
      });
      if (dispatched.handled) {
        const taskResults = await Promise.all(dispatched.tasks);
        setSelectionCaptureMessage(resolveTaskMessage(taskResults) ?? "範囲をカードへ追加しました");
      } else {
        await copyImageBlobToClipboard(blob);
        setSelectionCaptureMessage("範囲をコピーしました");
      }
      setIsSelectionCaptureActive(false);
    } catch (error) {
      console.error("[CardWorkspaceShell] selection capture failed", error);
      setSelectionCaptureMessage("範囲コピーに失敗しました");
    } finally {
      setIsSelectionCaptureBusy(false);
    }
  }, []);
  useEffect(() => {
    if (!selectionCaptureMessage) return;
    const timeoutId = window.setTimeout(() => {
      setSelectionCaptureMessage(null);
    }, 1800);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectionCaptureMessage]);
  const selectionCaptureControl = selectionCaptureEnabled && (
    <button
      type="button"
      data-selection-capture-ignore="true"
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm backdrop-blur-[2px] transition-colors hover:bg-white hover:text-slate-900",
        isSelectionCaptureActive && "border-slate-300 bg-slate-100 text-slate-900",
      )}
      aria-label="範囲コピー"
      aria-pressed={isSelectionCaptureActive}
      title="範囲コピー"
      onClick={handleStartSelectionCapture}
    >
      <SelectionCaptureGlyph />
    </button>
  );
  const hasTopLeftControls = hasRenderableNode(topLeftControl) || widthControl !== null;
  const hasTopRightControls = selectionCaptureEnabled || hasRenderableNode(topRightControl);
  const hasSelectionCaptureMessage = selectionCaptureMessage !== null;
  const hasMetaPanel = hasRenderableNode(metaPanel);
  return (
    <div className={cn(surfaceClassName, containerClassName)}>
      <div className={cn("relative flex h-full min-h-0 overflow-hidden", shellClassName)}>
        {hasTopLeftControls && (
          <div data-selection-capture-ignore="true" className="pointer-events-none absolute left-3 z-30 flex items-center gap-2" style={{ top: `${topControlsOffsetPx}px` }}>
            {hasRenderableNode(topLeftControl) && <div className="pointer-events-auto flex">{topLeftControl}</div>}
            {widthControl !== null && (
              <div className={cn("pointer-events-auto flex", widthControlClassName)}>
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
            )}
          </div>
        )}
        {overlayChildren}
        {hasTopRightControls && (
          <div data-selection-capture-ignore="true" className="pointer-events-auto absolute right-3 z-30 flex" style={{ top: `${topControlsOffsetPx}px` }}>
            <div className="flex items-center gap-2">
              {selectionCaptureControl}
              {topRightControl}
            </div>
          </div>
        )}
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", contentAreaClassName)}>
          <div ref={setViewportNode} className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden", viewportClassName)} style={viewportStyle}>
            {children}
            <SelectionCaptureOverlay targetRef={viewportNodeRef} active={isSelectionCaptureActive} busy={isSelectionCaptureBusy} onCancel={handleCancelSelectionCapture} onCapture={handleCaptureSelection} />
            {hasSelectionCaptureMessage && (
              <div data-selection-capture-ignore="true" className="pointer-events-none absolute left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full border border-slate-900/10 bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {selectionCaptureMessage}
              </div>
            )}
          </div>
        </div>
        {hasMetaPanel && (
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
        )}
      </div>
    </div>
  );
};



export { CardWorkspaceShell };


export type { CardWorkspaceSurfaceVariant, CardWorkspaceWidthControlProps, CardWorkspaceShellProps };
