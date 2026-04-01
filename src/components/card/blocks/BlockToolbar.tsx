import { cn } from "@/lib/utils";
import type { CardBlock } from "@/types/domain/card";
import { Code, HelpCircle, ImageIcon, Plus, StratisFormulaIcon, StratisMarkdownIcon, Type } from "@/ui/icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BlockToolbarProps {
  label: string;
  onAddBlock: (type: CardBlock["type"]) => void;
  settings?: unknown;
  hiddenBlockTypes?: CardBlock["type"][];
  desktopLayout?: "horizontal" | "vertical";
  className?: string;
}

type BlockConfig = {
  type: CardBlock["type"];
  label: string;
  icon?: string;
  isVisible?: boolean;
  enabled?: boolean;
  color?: string;
  orderIndex?: number;
};

const ALLOWED_TYPES: readonly CardBlock["type"][] = [
  "text",
  "question",
  "code",
  "image",
  "markdown",
  "math",
] as const;

const DEFAULT_CONFIGS: BlockConfig[] = [
  { type: "text",     label: "テキスト",  icon: "Type",        isVisible: true },
  { type: "question", label: "疑問",      icon: "HelpCircle",  isVisible: true },
  { type: "code",     label: "コード",    icon: "Code",        isVisible: true },
  { type: "image",    label: "画像",      icon: "Image",       isVisible: true },
  { type: "math",     label: "数式",      icon: "Sigma",       isVisible: true },
  { type: "markdown", label: "Markdown",  icon: "NotebookPen", isVisible: true },
];

const DEFAULT_ORDER_INDEX_BY_TYPE = DEFAULT_CONFIGS.reduce<
  Record<CardBlock["type"], number>
>((acc, config, index) => {
  acc[config.type] = index;
  return acc;
}, {} as Record<CardBlock["type"], number>);

function getIcon(iconName: string | undefined, type: CardBlock["type"]) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    Type: Type,
    Image: ImageIcon,
    Sigma: StratisFormulaIcon,
    Code: Code,
    NotebookPen: StratisMarkdownIcon,
    HelpCircle: HelpCircle,
  };
  if (iconName && map[iconName]) return map[iconName];
  const typeMap: Record<string, React.ComponentType<{ className?: string }>> = {
    text: Type,
    question: HelpCircle,
    code: Code,
    image: ImageIcon,
    markdown: StratisMarkdownIcon,
    math: StratisFormulaIcon,
  };
  return typeMap[type] ?? Plus;
}

// Tooltip コンポーネント — portal で body 直下に描画し overflow クリップを回避
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
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
      {pos && createPortal(
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
}

// アイコン only ボタン（ツールチップ付き）
function ActionButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Tooltip label={`${label}を追加`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}を追加`}
        className={cn(
          "group/toolbar inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-md",
          "text-[var(--sidebar-text-muted,#6e6e80)] transition-colors duration-100 select-none",
          "hover:text-[var(--sidebar-text,#202123)] hover:bg-[var(--sidebar-active-bg,#e7ebef)]",
          "active:bg-[var(--sidebar-active-bg,#e7ebef)] active:text-[var(--sidebar-text,#202123)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-accent,#7aa6a1)]",
        )}
      >
        <Icon
          className="w-4 h-4 shrink-0 opacity-70 transition-opacity duration-100 group-hover/toolbar:opacity-100 group-active/toolbar:opacity-100"
          style={{ strokeWidth: 1.2 }}
        />
      </button>
    </Tooltip>
  );
}

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

  type RawSettings = { editorBlockSettings?: Record<string, unknown>[] };
  const rawSettings = (settings as RawSettings | undefined)?.editorBlockSettings;

  const blockSettings: BlockConfig[] = useMemo(() => {
    if (!rawSettings || rawSettings.length === 0) return DEFAULT_CONFIGS;

    const fromSettings = rawSettings
      .map((x) => ({
        type: x["type"] as CardBlock["type"],
        label: (x["label"] as string | undefined) ?? String(x["type"]),
        icon: x["icon"] as string | undefined,
        isVisible: x["isVisible"] as boolean | undefined,
        enabled: x["enabled"] as boolean | undefined,
        color: x["color"] as string | undefined,
        orderIndex:
          typeof x["orderIndex"] === "number"
            ? (x["orderIndex"] as number)
            : undefined,
      }))
      .filter((x) => ALLOWED_TYPES.includes(x.type));

    // DB に保存されていない新しいブロック型をデフォルト設定から補完する
    const missingDefaults = DEFAULT_CONFIGS.filter(
      (d) => !fromSettings.some((s) => s.type === d.type),
    );

    const merged = [...fromSettings, ...missingDefaults];

    // 順序は配列の自然順ではなく orderIndex を優先し、UI の並びを安定化する。
    return merged.sort((a, b) => {
      const aOrder = a.orderIndex ?? DEFAULT_ORDER_INDEX_BY_TYPE[a.type] ?? 999;
      const bOrder = b.orderIndex ?? DEFAULT_ORDER_INDEX_BY_TYPE[b.type] ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (
        (DEFAULT_ORDER_INDEX_BY_TYPE[a.type] ?? 999) -
        (DEFAULT_ORDER_INDEX_BY_TYPE[b.type] ?? 999)
      );
    });
  }, [rawSettings]);

  const visibleConfigs = useMemo(
    () =>
      blockSettings.filter((config) => {
        if (!(config.isVisible ?? config.enabled ?? true)) return false;
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
    const VERTICAL_TOOLBAR_WIDTH_PX = 44; // w-11
    const update = () => {
      const el = verticalAnchorRef.current;
      if (!el) return;
      const anchorLeft = el.getBoundingClientRect().left;
      const mountTransform = (el.parentElement as HTMLElement | null)?.style
        ?.transform;
      // transform に "-100%" が含まれる配置では、アンカーがツールバー右端基準になる。
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
        desktopLayout === "vertical"
          ? "flex w-11 min-h-[220px] flex-col items-center gap-1 px-1.5 py-2 rounded-2xl"
          : "flex w-full items-center gap-0 px-2.5 h-8 min-h-[32px] rounded-xl",
        "border border-[rgba(148,163,184,0.3)]",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,246,250,0.9))]",
        "shadow-[0_5px_14px_rgba(15,23,42,0.08)] backdrop-blur-[2px]",
        className,
      )}
    >
      {/* モバイル: ドロップダウン */}
      <div className="flex md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
                "text-[11px] font-medium text-[var(--sidebar-text-muted,#6e6e80)] transition-colors duration-100",
                "hover:text-[var(--sidebar-text,#202123)] hover:bg-[var(--sidebar-active-bg,#e7ebef)]",
                "active:bg-[var(--sidebar-active-bg,#e7ebef)] active:text-[var(--sidebar-text,#202123)]",
              )}
              aria-label={`${label} にブロックを追加`}
            >
              <Plus className="w-3 h-3" />
              <span>ブロックを追加</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="rounded-xl border-slate-100 shadow-lg p-1.5 min-w-[200px]"
          >
            {visibleConfigs.length === 0 ? (
              <div className="px-2 py-2 text-xs text-slate-400">
                追加できるブロックがありません
              </div>
            ) : (
              visibleConfigs.map((config) => {
                const Icon = getIcon(config.icon, config.type);
                return (
                  <DropdownMenuItem
                    key={config.type}
                    onClick={() => onAddBlock(config.type)}
                    className="rounded-lg flex items-center gap-2.5 py-2 px-2 text-[var(--sidebar-text-muted,#6e6e80)] focus:text-[var(--sidebar-text,#202123)] focus:bg-[var(--sidebar-active-bg,#e7ebef)]"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 border border-slate-200/70">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[12px] font-medium">{config.label}</span>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* デスクトップ: アイコン only ボタン（横/縦） */}
      <div
        className={cn(
          "hidden md:flex items-center gap-1",
          desktopLayout === "vertical"
            ? "flex-col overflow-y-hidden"
            : "flex-nowrap overflow-x-hidden",
        )}
      >
        {visibleConfigs.map((config) => {
          const Icon = getIcon(config.icon, config.type);
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
        <div ref={verticalAnchorRef} className="hidden md:block h-0 w-0" aria-hidden />
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

  return (
    renderToolbarShell()
  );
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

export const BlockToolbar = React.memo(
  BlockToolbarInner,
  areBlockToolbarPropsEqual,
);
BlockToolbar.displayName = "BlockToolbar";
