import React from "react";
import { Plus } from "@/ui/icons";
import { Type } from "@/ui/icons";
import { Code } from "@/ui/icons";
import { ImageIcon } from "@/ui/icons";
import { StratisFormulaIcon } from "@/ui/icons";
import { StratisMarkdownIcon } from "@/ui/icons";
import { cn } from "@/lib/utils"; // clsx + tailwind-merge のユーティリティ
import type { CardBlock } from "@/types";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---- Props 定義 ----
interface BlockToolbarProps {
  label: string; // ツールバー左端に表示するラベル（例: "表面" / "裏面"）
  onAddBlock: (type: CardBlock["type"]) => void; // ブロック追加時に呼ばれるコールバック
  settings?: unknown; // ユーザー設定（ブロックの表示順・可視状態など）
  hiddenBlockTypes?: CardBlock["type"][]; // 強制的に非表示にするブロック種別リスト
  className?: string;
}

// ブロック設定の内部型（設定オブジェクト1件分）
type BlockConfig = {
  type: CardBlock["type"];
  label: string;
  icon?: string; // アイコン名（文字列）
  isVisible?: boolean; // 表示するか（UserSettings 由来）
  enabled?: boolean; // 有効か（isVisible の別名的なフラグ）
  color?: string; // ホバー時のカラーテーマキー
};

// このツールバーが扱える型の許可リスト（settings に未知の type が混入しても無視する）
const ALLOWED_TYPES: readonly CardBlock["type"][] = [
  "text",
  "code",
  "image",
  "markdown",
  "math",
] as const;

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  label,
  onAddBlock,
  settings,
  hiddenBlockTypes = [],
  className,
}) => {
  // ---- ブロック設定を解決する ----
  // settings.editorBlockSettings があればそれを使い、なければハードコードされたデフォルトを使う
  // filter で ALLOWED_TYPES に含まれない type を弾いてセキュリティ的な安全を確保
  const blockSettings: BlockConfig[] =
    settings?.editorBlockSettings && settings.editorBlockSettings.length > 0
      ? settings.editorBlockSettings
          .map((x: unknown) => ({
            type: x.type as CardBlock["type"],
            label: x.label ?? String(x.type),
            icon: x.icon,
            isVisible: x.isVisible,
            enabled: x.enabled,
            color: x.color,
          }))
          .filter((x: BlockConfig) => ALLOWED_TYPES.includes(x.type))
      : [
          // ↓ デフォルト設定（設定が無い場合のフォールバック）
          {
            type: "text",
            label: "テキスト",
            icon: "Type",
            isVisible: true,
            color: "primary",
          },
          {
            type: "code",
            label: "コード",
            icon: "Code",
            isVisible: true,
            color: "indigo",
          },
          {
            type: "image",
            label: "画像",
            icon: "Image",
            isVisible: true,
            color: "emerald",
          },
          {
            type: "markdown",
            label: "Markdown",
            icon: "NotebookPen",
            isVisible: true,
            color: "rose",
          },
          {
            type: "math",
            label: "数式",
            icon: "Sigma",
            isVisible: true,
            color: "purple",
          },
        ];

  // ---- アイコン名の文字列 → React コンポーネントへの変換 ----
  // iconName が指定されていればそちらを優先し、なければ type から推測する
  const getIcon = (iconName: string | undefined, type: CardBlock["type"]) => {
    if (iconName) {
      switch (iconName) {
        case "Type":
          return Type;
        case "Image":
          return ImageIcon;
        case "Sigma":
          return StratisFormulaIcon;
        case "Code":
          return Code;
        case "NotebookPen":
          return StratisMarkdownIcon;
      }
    }
    // iconName が未定義 or 未知の値だった場合のフォールバック
    switch (type) {
      case "text":
        return Type;
      case "code":
        return Code;
      case "image":
        return ImageIcon;
      case "markdown":
        return StratisMarkdownIcon;
      case "math":
        return StratisFormulaIcon;
      default:
        return Plus; // 想定外の type には「＋」アイコンを表示
    }
  };

  // ---- 特定 type を非表示にすべきか判定 ----
  // hiddenBlockTypes に含まれる / Prop で禁止されている場合は true を返す
  const isTypeHidden = (type: CardBlock["type"]) => {
    if (hiddenBlockTypes.includes(type)) return true;
    return false;
  };

  // ---- 実際に表示するブロック設定を絞り込む ----
  // isVisible / enabled のどちらも未設定なら表示する（true がデフォルト）
  const visibleConfigs = blockSettings.filter((config) => {
    const isVisible = config.isVisible ?? config.enabled ?? true;
    if (!isVisible) return false;
    if (isTypeHidden(config.type)) return false;
    return true;
  });

  // ---- ツールバー共通ボタンリスト ----
  const toolbarButtons = visibleConfigs.map((config) => {
    const Icon = getIcon(config.icon, config.type);
    return (
      <button
        key={config.type}
        type="button"
        onClick={() => onAddBlock(config.type)}
        className={cn(
          "flex items-center gap-1.5 px-2 h-6 rounded text-slate-400",
          "text-[10px] font-medium leading-none transition-colors duration-100",
          "hover:text-slate-700 hover:bg-slate-100/70",
          "active:scale-95",
        )}
        aria-label={`${config.label}を追加`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span>{config.label}</span>
      </button>
    );
  });

  return (
    <div
      className={cn(
        "flex w-full items-center gap-0.5 px-3 py-1",
        className,
      )}
    >
      {/* ラベル */}
      <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest leading-none mr-2 shrink-0 select-none">
        {label}
      </span>

      {/* 区切り */}
      <div className="w-px h-3.5 bg-slate-200 mr-1.5 shrink-0" />

      {/* モバイル: ドロップダウン */}
      <div className="flex md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-2 h-6 rounded text-slate-400 text-[10px] font-medium hover:text-slate-700 hover:bg-slate-100/70 transition-colors"
              aria-label={`${label} にブロックを追加`}
            >
              <Plus className="w-3 h-3" />
              <span>追加</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="rounded-2xl border-slate-100 shadow-xl p-2 min-w-[220px]"
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
                    className="rounded-xl flex items-center gap-2 py-2 text-slate-600 focus:text-slate-800"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-50 border border-slate-200/60">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[12px] font-bold">{config.label}</span>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* デスクトップ: 横一列ボタン */}
      <div className="hidden md:flex items-center gap-0.5 flex-nowrap overflow-x-auto no-scrollbar">
        {toolbarButtons}
      </div>
    </div>
  );
};




