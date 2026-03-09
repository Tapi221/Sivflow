import React from "react";
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

// 小さな pill ボタン（アクション群用）
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
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}を追加`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
        "text-[11px] font-medium leading-none select-none",
        "text-slate-500 transition-colors duration-100",
        "hover:text-slate-900 hover:bg-slate-100",
        "active:bg-slate-200 active:text-slate-900 active:scale-95",
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

// セクションラベル（「問題」「解答」など） — インタラクションなし
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center h-full mr-2 shrink-0 select-none text-[12px] font-semibold text-slate-900 leading-none"
    >
      {children}
    </span>
  );
}

// ラベルとアクション群の間の縦仕切り
function Divider() {
  return <div className="w-px h-4 bg-slate-200/80 shrink-0 mr-2" />;
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
        "flex w-full items-center px-3 gap-0",
        "h-10 min-h-[40px]",
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

      {/* デスクトップ: pill ボタン横並び */}
      <div className="hidden md:flex items-center gap-0.5 flex-nowrap overflow-x-auto no-scrollbar">
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
