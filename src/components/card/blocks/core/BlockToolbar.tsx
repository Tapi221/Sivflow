import { cn } from "@/lib/utils";
import type { CardBlock } from "@/types/domain/card";
import type { IconProps } from "@/ui/icons";
import {
  Code,
  HelpCircle,
  ImageIcon,
  Plus,
  StratisFormulaIcon,
  StratisMarkdownIcon,
  Type,
} from "@/ui/icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

type TooltipPosition = {
  x: number;
  y: number;
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
  { type: "text", label: "テキスト", icon: "Type", isVisible: true },
  { type: "question", label: "疑問", icon: "HelpCircle", isVisible: true },
  { type: "code", label: "コード", icon: "Code", isVisible: true },
  { type: "image", label: "画像", icon: "Image", isVisible: true },
  { type: "math", label: "数式", icon: "Sigma", isVisible: true },
  {
    type: "markdown",
    label: "Markdown",
    icon: "NotebookPen",
    isVisible: true,
  },
];

const DEFAULT_ORDER_INDEX_BY_TYPE = DEFAULT_CONFIGS.reduce<
  Record<CardBlock["type"], number>
>((acc, config, index) => {
  acc[config.type] = index;
  return acc;
}, {} as Record<CardBlock["type"], number>);

const getIcon = (
  iconName: string | undefined,
  type: CardBlock["type"],
) => {
  const iconMap: Record<string, React.ComponentType<IconProps>> = {
    Type: Type,
    Image: ImageIcon,
    Sigma: StratisFormulaIcon,
    Code: Code,
    NotebookPen: StratisMarkdownIcon,
    HelpCircle: HelpCircle,
  };

  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }

  const typeMap: Record<string, React.ComponentType<IconProps>> = {
    text: Type,
    question: HelpCircle,
    code: Code,
    image: ImageIcon,
    markdown: StratisMarkdownIcon,
    math: StratisFormulaIcon,
  };

  return typeMap[type] ?? Plus;
};

const canShowHoverTooltip = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
};

const Tooltip = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const show = () => {
    if (!canShowHoverTooltip()) return;
    if (!anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const hide = () => {
    setPosition(null);
  };

  useEffect(() => {
    if (!position || typeof window === "undefined") return;

    const handleScroll = () => {
      setPosition(null);
    };

    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [position]);

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

      {position && typeof document !== "undefined"
        ? createPortal(
            <>
              <style>{`
              @keyframes block-toolbar-tooltip-in {
                from {
                  opacity: 0;
                  transform: translate(-50%, -4px);
                }
                to {
                  opacity: 1;
                  transform: translate(-50%, 0);
                }
              }
            `}</style>

              <div
                role="tooltip"
                style={{
                  position: "fixed",
                  left: position.x,
                  top: position.y,
                  transform: "translate(-50%, -100%)",
                  zIndex: 100,
                  pointerEvents: "none",
                  animation:
                    "block-toolbar-tooltip-in 0.14s ease-out forwards",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    background: "rgba(15, 23, 42, 0.92)",
                    color: "#f8fafc",
                    fontSize: "11px",
                    fontWeight: 600,
                    lineHeight: 1,
                    padding: "6px 8px",
                    borderRadius: "8px",
                    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.18)",
                    letterSpacing: "0.01em",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {label}
                </span>
              </div>
            </>,
            document.body,
          )
        : null}
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
  const ariaLabel = `${label}を追加`;

  return (
    <Tooltip label={ariaLabel}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          "group/toolbar relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          "border border-transparent bg-transparent text-slate-500",
          "transition-all duration-150 ease-out select-none",
          "hover:-translate-y-0.5 hover:border-[rgba(148,163,184,0.24)] hover:bg-white hover:text-slate-900",
          "hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]",
          "active:translate-y-0 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-accent,#7aa6a1)]",
        )}
      >
        <Icon
          className="h-[18px] w-[18px] shrink-0 opacity-80 transition-opacity duration-150 group-hover/toolbar:opacity-100"
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
  type RawSettings = { editorBlockSettings?: Record<string, unknown>[] };
  const rawSettings = (settings as RawSettings | undefined)?.editorBlockSettings;

  const blockSettings: BlockConfig[] = useMemo(() => {
    if (!rawSettings || rawSettings.length === 0) return DEFAULT_CONFIGS;

    const fromSettings = rawSettings
      .map((item) => ({
        type: item["type"] as CardBlock["type"],
        label: (item["label"] as string | undefined) ?? String(item["type"]),
        icon: item["icon"] as string | undefined,
        isVisible: item["isVisible"] as boolean | undefined,
        enabled: item["enabled"] as boolean | undefined,
        color: item["color"] as string | undefined,
        orderIndex:
          typeof item["orderIndex"] === "number"
            ? (item["orderIndex"] as number)
            : undefined,
      }))
      .filter((item) => ALLOWED_TYPES.includes(item.type));

    const missingDefaults = DEFAULT_CONFIGS.filter(
      (defaultConfig) =>
        !fromSettings.some(
          (settingConfig) => settingConfig.type === defaultConfig.type,
        ),
    );
    const merged = [...fromSettings, ...missingDefaults];

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

  const visibleConfigs = useMemo(() => {
    return blockSettings.filter((config) => {
      if (!ALLOWED_TYPES.includes(config.type)) return false;
      if (config.isVisible === false) return false;
      if (config.enabled === false) return false;
      if (hiddenBlockTypes.includes(config.type)) return false;
      return true;
    });
  }, [blockSettings, hiddenBlockTypes]);

  const buttons =
    visibleConfigs.length === 0 ? (
      <div className="inline-flex h-11 items-center rounded-2xl px-3 text-[11px] font-medium text-slate-400">
        追加できるブロックがありません
      </div>
    ) : (
      visibleConfigs.map((config) => {
        const Icon = getIcon(config.icon, config.type);

        return (
          <ActionButton
            key={config.type}
            onClick={() => onAddBlock(config.type)}
            icon={Icon}
            label={config.label}
          />
        );
      })
    );

  if (desktopLayout === "vertical") {
    return (
      <div className={cn("flex items-center gap-1.5 overflow-x-auto", className)}>
        {buttons}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full items-center gap-1 rounded-[22px] border border-[rgba(148,163,184,0.24)]",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,249,252,0.94))]",
        "px-2 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-[8px]",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 shrink-0 items-center rounded-2xl border px-3",
          "border-[rgba(148,163,184,0.16)] bg-white/84",
          "text-[11px] font-semibold tracking-[0.01em] text-slate-600",
        )}
      >
        {label}
      </span>

      <div className="h-7 w-px shrink-0 bg-slate-200/80" aria-hidden />

      {buttons}
    </div>
  );
};

const areBlockToolbarPropsEqual = (
  prev: BlockToolbarProps,
  next: BlockToolbarProps,
) => {
  if (prev.label !== next.label) return false;
  if (prev.onAddBlock !== next.onAddBlock) return false;
  if (prev.settings !== next.settings) return false;
  if (prev.hiddenBlockTypes !== next.hiddenBlockTypes) return false;
  if (prev.desktopLayout !== next.desktopLayout) return false;
  if (prev.className !== next.className) return false;
  return true;
};

export const BlockToolbar = React.memo(
  BlockToolbarInner,
  areBlockToolbarPropsEqual,
);

BlockToolbar.displayName = "BlockToolbar";

