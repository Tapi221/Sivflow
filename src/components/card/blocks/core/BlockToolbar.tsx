import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IconProps } from "@web-renderer/chip/icons";
import { Plus } from "@web-renderer/chip/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@web-renderer/chip/panel/dropdown-menu";
import { cn } from "@web-renderer/lib/utils";
import { overlayGlassActionButtonClassName, overlayGlassPillClassName, overlayGlassToolbarClassName } from "@/components/card/shell/overlaySurfaceClassNames";
import type { EditorBlockIconName, EditorBlockType } from "@/lib/editorBlockSettings";
import { getEditorBlockDefinition, parseEditorBlockSettings } from "@/lib/editorBlockSettings";
import type { CardBlock } from "@/types/domain/card";



interface BlockToolbarProps {
  label: string;
  onAddBlock: (type: CardBlock["type"]) => void;
  settings?: unknown;
  hiddenBlockTypes?: CardBlock["type"][];
  desktopLayout?: "horizontal" | "vertical";
  className?: string;
}
type ToolbarBlockConfig = {
  type: EditorBlockType;
  label: string;
  icon: EditorBlockIconName;
  isVisible: boolean;
  orderIndex: number;
};



const areBlockToolbarPropsEqual = (
  prev: BlockToolbarProps,
  next: BlockToolbarProps,
) =>
  prev.label === next.label &&
  prev.onAddBlock === next.onAddBlock &&
  prev.settings === next.settings &&
  prev.hiddenBlockTypes === next.hiddenBlockTypes &&
  prev.desktopLayout === next.desktopLayout &&
  prev.className === next.className;
const getIcon = (
  iconName: EditorBlockIconName,
): React.ComponentType<IconProps> => {
  const map: Record<EditorBlockIconName, React.ComponentType<IconProps>> = {
    Type: TextBlockGlyph,
    HelpCircle: QuestionBlockGlyph,
    Code: CodeBlockGlyph,
    Image: ImageBlockGlyph,
    Sigma: MathBlockGlyph,
    NotebookPen: MarkdownBlockGlyph,
  };

  return map[iconName];
};



const TextBlockGlyph = ({
  size = 16,
  className,
  label,
  title,
  style,
  ...rest
}: IconProps) => {
  const resolvedLabel = label ?? rest["aria-label"];
  const decorative = (resolvedLabel === null || resolvedLabel === undefined);
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={pixelSize}
      height={pixelSize}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? "presentation" : "img"}
      aria-label={resolvedLabel}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d="M3.5 4.25h9" />
      <path d="M5 8h6" opacity="0.82" />
      <path d="M3.5 11.75h9" opacity="0.64" />
    </svg>
  );
};
const QuestionBlockGlyph = ({
  size = 16,
  className,
  label,
  title,
  style,
  ...rest
}: IconProps) => {
  const resolvedLabel = label ?? rest["aria-label"];
  const decorative = (resolvedLabel === null || resolvedLabel === undefined);
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={pixelSize}
      height={pixelSize}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? "presentation" : "img"}
      aria-label={resolvedLabel}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M8 3.25c-2.62 0-4.75 1.66-4.75 3.92 0 1.27.67 2.34 1.82 3.06l-.23 2.02 1.98-1.16c.39.08.79.12 1.18.12 2.62 0 4.75-1.66 4.75-4.04S10.62 3.25 8 3.25Z"
        opacity="0.92"
      />
      <path d="M6.9 6.35a1.33 1.33 0 1 1 2.38.82c-.45.52-.98.83-.98 1.58" />
      <circle cx="8" cy="10.8" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  );
};
const CodeBlockGlyph = ({
  size = 16,
  className,
  label,
  title,
  style,
  ...rest
}: IconProps) => {
  const resolvedLabel = label ?? rest["aria-label"];
  const decorative = (resolvedLabel === null || resolvedLabel === undefined);
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={pixelSize}
      height={pixelSize}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? "presentation" : "img"}
      aria-label={resolvedLabel}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d="M5.75 4.25 2.9 8l2.85 3.75" opacity="0.88" />
      <path d="m10.25 4.25 2.85 3.75-2.85 3.75" opacity="0.88" />
      <path d="M8.9 3.5 7.1 12.5" />
    </svg>
  );
};
const ImageBlockGlyph = ({
  size = 16,
  className,
  label,
  title,
  style,
  ...rest
}: IconProps) => {
  const resolvedLabel = label ?? rest["aria-label"];
  const decorative = (resolvedLabel === null || resolvedLabel === undefined);
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={pixelSize}
      height={pixelSize}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? "presentation" : "img"}
      aria-label={resolvedLabel}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <rect x="2.5" y="3.25" width="11" height="9.5" rx="2" opacity="0.92" />
      <circle
        cx="5.4"
        cy="6.1"
        r="1.05"
        fill="currentColor"
        stroke="none"
        opacity="0.82"
      />
      <path d="m4.1 11 2.15-2.25 1.85 1.7 2.1-2.55 1.7 3.1" opacity="0.78" />
    </svg>
  );
};
const MathBlockGlyph = ({
  size = 16,
  className,
  label,
  title,
  style,
  ...rest
}: IconProps) => {
  const resolvedLabel = label ?? rest["aria-label"];
  const decorative = (resolvedLabel === null || resolvedLabel === undefined);
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={pixelSize}
      height={pixelSize}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? "presentation" : "img"}
      aria-label={resolvedLabel}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d="M2.8 8.55h1.35l1.2 2.75L7.9 4.7h5.3" opacity="0.92" />
      <path d="M10.15 9.1h3" opacity="0.82" />
      <path d="M11.65 7.6v3" opacity="0.82" />
    </svg>
  );
};
const MarkdownBlockGlyph = ({
  size = 16,
  className,
  label,
  title,
  style,
  ...rest
}: IconProps) => {
  const resolvedLabel = label ?? rest["aria-label"];
  const decorative = (resolvedLabel === null || resolvedLabel === undefined);
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={pixelSize}
      height={pixelSize}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? "presentation" : "img"}
      aria-label={resolvedLabel}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M5 3.1h4.55l2.2 2.2v7.6a1.7 1.7 0 0 1-1.7 1.7H5A1.7 1.7 0 0 1 3.3 12.9V4.8A1.7 1.7 0 0 1 5 3.1Z"
        opacity="0.92"
      />
      <path d="M9.55 3.1v2.2h2.2" opacity="0.58" />
      <path d="M5.45 7.25h4.7" opacity="0.84" />
      <path d="M5.45 9.35h3.8" opacity="0.68" />
      <path d="M5.45 11.45h4.2" opacity="0.52" />
    </svg>
  );
};
const Tooltip = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  const [pos, setPos] = useState<{ x: number; y: number; } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const show = () => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top - 6 });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onScroll = () => setPos(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [pos]);

  return (
    <>
      <div
        ref={anchorRef}
        className="relative inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {pos &&
        createPortal(
          <>
            <style>{`
            @keyframes bt-tooltip-in {
              from { opacity: 0; transform: translate(-50%, -4px); }
              to   { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
            <div
              role="tooltip"
              style={{
                position: "fixed",
                left: pos.x,
                top: pos.y,
                transform: "translate(-50%, -100%)",
                zIndex: 9999,
                pointerEvents: "none",
                animation: "bt-tooltip-in 0.15s ease forwards",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  background: "rgba(22,27,34,0.92)",
                  color: "#e6edf3",
                  fontSize: "11px",
                  fontWeight: 500,
                  lineHeight: 1,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  backdropFilter: "blur(4px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </span>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};
const ActionButton = ({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: React.ComponentType<IconProps>;
  label: string;
}) => {
  return (
    <Tooltip label={`${label}を追加`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}を追加`}
        className={cn(
          overlayGlassActionButtonClassName,
          "group/toolbar shrink-0",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[var(--sidebar-active-accent,#35507b)]/35",
        )}
      >
        <Icon
          className="h-3.5 w-3.5 shrink-0 opacity-80 transition-opacity duration-150 group-hover/toolbar:opacity-100 group-active/toolbar:opacity-100"
          style={{ strokeWidth: 1.2 }}
        />
      </button>
    </Tooltip>
  );
};
const BlockToolbarInner: React.FC<BlockToolbarProps> = ({
  label,
  onAddBlock,
  settings,
  hiddenBlockTypes = [],
  desktopLayout = "horizontal",
  className,
}) => {
  const verticalAnchorRef = useRef<HTMLDivElement | null>(null);
  const [verticalFixedLeft, setVerticalFixedLeft] = useState<number | null>(
    null,
  );

  type RawSettings = {
    editorBlockSettings?: unknown[]; };
  const rawSettings = (settings as RawSettings | undefined)
    ?.editorBlockSettings;

  const blockSettings = useMemo<ToolbarBlockConfig[]>(() => {
    return parseEditorBlockSettings(rawSettings).map((config) => {
      const definition = getEditorBlockDefinition(config.type);

      return {
        type: config.type,
        label: definition.label,
        icon: definition.icon,
        isVisible: config.isVisible,
        orderIndex: config.orderIndex,
      };
    });
  }, [rawSettings]);

  const visibleConfigs = useMemo(
    () =>
      blockSettings.filter((config) => {
        if (!config.isVisible) return false;
        if (hiddenBlockTypes.includes(config.type)) return false;
        return true;
      }),
    [blockSettings, hiddenBlockTypes],
  );

  useEffect(() => {
    if (desktopLayout !== "vertical") {
      return;
    }
    if (typeof window === "undefined") return;

    let rafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const VERTICAL_TOOLBAR_WIDTH_PX = 47;
    const update = () => {
      const el = verticalAnchorRef.current;
      if (!el) return;
      const anchorLeft = el.getBoundingClientRect().left;
      const mountTransform = (el.parentElement as HTMLElement | null)?.style
        ?.transform;
      const shouldShiftByToolbarWidth =
        typeof mountTransform === "string" && mountTransform.includes("-100%");
      const nextLeft = shouldShiftByToolbarWidth
        ? anchorLeft - VERTICAL_TOOLBAR_WIDTH_PX
        : anchorLeft;
      setVerticalFixedLeft((prev) =>
        prev !== null && Math.abs(prev - nextLeft) < 0.5 ? prev : nextLeft,
      );
    };
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };

    update();
    window.addEventListener("resize", scheduleUpdate);
    const anchorEl = verticalAnchorRef.current;
    if (anchorEl && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(anchorEl);
      if (anchorEl.parentElement) {
        resizeObserver.observe(anchorEl.parentElement);
      }
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [desktopLayout]);

  const renderToolbarShell = () => (
    <div
      className={cn(
        desktopLayout === "vertical" ? "w-fit flex-col" : "w-auto max-w-full",
        "gap-2 px-2.5",
        overlayGlassToolbarClassName,
        className,
      )}
    >
      <div className="flex md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                overlayGlassPillClassName,
                "text-xs font-semibold text-[#5f554d]",
              )}
              aria-label={`${label} にブロックを追加`}
            >
              <Plus className="w-3 h-3" />
              <span>ブロックを追加</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="rounded-xl border-slate-100 shadow-lg p-1.5 min-w-48"
          >
            {visibleConfigs.length === 0 ? (
              <div className="px-2 py-2 text-xs text-slate-400">
                追加できるブロックがありません
              </div>
            ) : (
              visibleConfigs.map((config) => {
                const Icon = getIcon(config.icon);
                return (
                  <DropdownMenuItem
                    key={config.type}
                    onClick={() => onAddBlock(config.type)}
                    className="rounded-lg flex items-center gap-2.5 py-2 px-2 text-[var(--sidebar-text-muted,#6e6e80)] focus:text-[var(--sidebar-text,#202123)] focus:bg-[var(--sidebar-active-bg,#e7ebef)]"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 border border-slate-200/70">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-medium">
                      {config.label}
                    </span>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        className={cn(
          "hidden md:flex items-center",
          desktopLayout === "vertical"
            ? "flex-col gap-2 overflow-y-hidden"
            : "flex-nowrap gap-2 overflow-x-hidden",
        )}
      >
        {visibleConfigs.map((config) => {
          const Icon = getIcon(config.icon);
          return (
            <ActionButton
              key={config.type}
              onClick={() => onAddBlock(config.type)}
              icon={Icon}
              label={config.label}
            />
          );
        })}
      </div>
    </div>
  );

  if (desktopLayout === "vertical") {
    return (
      <>
        <div
          ref={verticalAnchorRef}
          className="hidden md:block h-0 w-0"
          aria-hidden
        />
        <div className="md:hidden">{renderToolbarShell()}</div>
        {typeof document !== "undefined" &&
          createPortal(
            <div
              className="hidden md:block"
              style={{
                position: "fixed",
                top: "50dvh",
                left: verticalFixedLeft ?? -9999,
                transform: "translateY(-50%)",
                zIndex: 30,
              }}
            >
              {renderToolbarShell()}
            </div>,
            document.body,
          )}
      </>
    );
  }

  return renderToolbarShell();
};



const BlockToolbar = React.memo(BlockToolbarInner, areBlockToolbarPropsEqual);
BlockToolbar.displayName = "BlockToolbar";

export { BlockToolbar };
