import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus } from "@/ui/icons";
import { Type } from "@/ui/icons";
import { Code } from "@/ui/icons";
import { ImageIcon } from "@/ui/icons";
import { StratisFormulaIcon } from "@/ui/icons";
import { StratisMarkdownIcon } from "@/ui/icons";
import { cn } from "@/lib/utils";
import type { CardBlock } from "@/types";

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
  className?: string;
}

type BlockConfig = {
  type: CardBlock["type"];
  label: string;
  icon?: string;
  isVisible?: boolean;
  enabled?: boolean;
  color?: string;
};

const ALLOWED_TYPES: readonly CardBlock["type"][] = [
  "text",
  "code",
  "image",
  "markdown",
  "math",
] as const;

const DEFAULT_CONFIGS: BlockConfig[] = [
  { type: "text",     label: "テキスト",  icon: "Type",        isVisible: true },
  { type: "code",     label: "コード",    icon: "Code",        isVisible: true },
  { type: "image",    label: "画像",      icon: "Image",       isVisible: true },
  { type: "math",     label: "数式",      icon: "Sigma",       isVisible: true },
  { type: "markdown", label: "Markdown",  icon: "NotebookPen", isVisible: true },
];

function getIcon(iconName: string | undefined, type: CardBlock["type"]) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    Type: Type,
    Image: ImageIcon,
    Sigma: StratisFormulaIcon,
    Code: Code,
    NotebookPen: StratisMarkdownIcon,
  };
  if (iconName && map[iconName]) return map[iconName];
  const typeMap: Record<string, React.ComponentType<{ className?: string }>> = {
    text: Type,
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
          "inline-flex items-center justify-center w-9 h-9 rounded-md",
          "text-slate-500 transition-colors duration-100 select-none",
          "hover:text-slate-700 hover:bg-slate-100 hover:shadow-sm",
          "active:bg-slate-200 active:text-slate-900",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
      </button>
    </Tooltip>
  );
}

// セクションラベル（「問題」「解答」など） — インタラクションなし
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center h-full mr-1.5 shrink-0 select-none text-[11px] font-semibold text-slate-700 leading-none"
    >
      {children}
    </span>
  );
}

// ラベルとアクション群の間の縦仕切り
function Divider() {
  return <div className="w-px h-3.5 bg-slate-200/80 shrink-0 mr-1.5" />;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  label,
  onAddBlock,
  settings,
  hiddenBlockTypes = [],
  className,
}) => {
  type RawSettings = { editorBlockSettings?: Record<string, unknown>[] };
  const rawSettings = (settings as RawSettings | undefined)?.editorBlockSettings;

  const blockSettings: BlockConfig[] =
    rawSettings && rawSettings.length > 0
      ? rawSettings
          .map((x) => ({
            type: x["type"] as CardBlock["type"],
            label: (x["label"] as string | undefined) ?? String(x["type"]),
            icon: x["icon"] as string | undefined,
            isVisible: x["isVisible"] as boolean | undefined,
            enabled: x["enabled"] as boolean | undefined,
            color: x["color"] as string | undefined,
          }))
          .filter((x) => ALLOWED_TYPES.includes(x.type))
      : DEFAULT_CONFIGS;

  const visibleConfigs = blockSettings.filter((config) => {
    if (!(config.isVisible ?? config.enabled ?? true)) return false;
    if (hiddenBlockTypes.includes(config.type)) return false;
    return true;
  });

  return (
    <div
      className={cn(
        "flex w-full items-center px-2.5 gap-0",
        "h-8 min-h-[32px]",
        "bg-slate-50/60 border-b border-slate-200",
        className,
      )}
    >
      {/* セクションラベル（問題 / 解答 など） */}
      <SectionLabel>{label}</SectionLabel>

      {/* ラベルとアクション群の区切り */}
      <Divider />

      {/* モバイル: ドロップダウン */}
      <div className="flex md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
                "text-[11px] font-medium text-slate-500 transition-colors duration-100",
                "hover:text-slate-900 hover:bg-slate-100",
                "active:bg-slate-200 active:text-slate-900",
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
                    className="rounded-lg flex items-center gap-2.5 py-2 px-2 text-slate-600 focus:text-slate-800 focus:bg-slate-100"
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

      {/* デスクトップ: アイコン only ボタン横並び */}
      <div className="hidden md:flex items-center gap-1 flex-nowrap overflow-x-auto no-scrollbar">
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
};
