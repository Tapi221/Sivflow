import React from 'react';
import {
  Plus
} from 'lucide-react';
// lucide-react のアイコンを個別インポート（named export が無いアイコンは dist から直接取得）
import TypeIcon from 'lucide-react/dist/esm/icons/type';
import CodeIcon from 'lucide-react/dist/esm/icons/code';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import SigmaIcon from 'lucide-react/dist/esm/icons/sigma';
import NotebookPenIcon from 'lucide-react/dist/esm/icons/notebook-pen';
import { cn } from '@/lib/utils'; // clsx + tailwind-merge のユーティリティ
import type { CardBlock } from '@/types';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

// ---- Props 定義 ----
interface BlockToolbarProps {
  label: string;                              // ツールバー左端に表示するラベル（例: "表面" / "裏面"）
  onAddBlock: (type: CardBlock['type']) => void; // ブロック追加時に呼ばれるコールバック
  settings?: any;                             // ユーザー設定（ブロックの表示順・可視状態など）
  hiddenBlockTypes?: CardBlock['type'][];     // 強制的に非表示にするブロック種別リスト
  className?: string;
}

// ブロック設定の内部型（設定オブジェクト1件分）
type BlockConfig = {
  type: CardBlock['type'];
  label: string;
  icon?: string;       // アイコン名（文字列）
  isVisible?: boolean; // 表示するか（UserSettings 由来）
  enabled?: boolean;   // 有効か（isVisible の別名的なフラグ）
  color?: string;      // ホバー時のカラーテーマキー
};

// このツールバーが扱える型の許可リスト（settings に未知の type が混入しても無視する）
const ALLOWED_TYPES: readonly CardBlock['type'][] = [
  'text', 'code', 'image', 'markdown', 'math',
] as const;

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  label,
  onAddBlock,
  settings,
  hiddenBlockTypes = [],
  className
}) => {

  // ---- ブロック設定を解決する ----
  // settings.editorBlockSettings があればそれを使い、なければハードコードされたデフォルトを使う
  // filter で ALLOWED_TYPES に含まれない type を弾いてセキュリティ的な安全を確保
  const blockSettings: BlockConfig[] =
    (settings?.editorBlockSettings && settings.editorBlockSettings.length > 0)
      ? settings.editorBlockSettings
          .map((x: any) => ({
            type: x.type as CardBlock['type'],
            label: x.label ?? String(x.type),
            icon: x.icon,
            isVisible: x.isVisible,
            enabled: x.enabled,
            color: x.color,
          }))
          .filter((x: BlockConfig) => ALLOWED_TYPES.includes(x.type))
      : [
          // ↓ デフォルト設定（設定が無い場合のフォールバック）
          { type: 'text',      label: 'テキスト',  icon: 'Type',        isVisible: true, color: 'primary'  },
          { type: 'code',      label: 'コード',    icon: 'Code',        isVisible: true, color: 'indigo'   },
          { type: 'image',     label: '画像',      icon: 'Image',       isVisible: true, color: 'emerald'  },
          { type: 'markdown',  label: 'Markdown',  icon: 'NotebookPen', isVisible: true, color: 'rose'     },
          { type: 'math',      label: '数式',      icon: 'Sigma',       isVisible: true, color: 'purple'   },
        ];

  // ---- アイコン名の文字列 → React コンポーネントへの変換 ----
  // iconName が指定されていればそちらを優先し、なければ type から推測する
  const getIcon = (iconName: string | undefined, type: CardBlock['type']) => {
    if (iconName) {
      switch (iconName) {
        case 'Type':       return TypeIcon;
        case 'Image':      return ImageIcon;
        case 'Sigma':      return SigmaIcon;
        case 'Code':       return CodeIcon;
        case 'NotebookPen':return NotebookPenIcon;
      }
    }
    // iconName が未定義 or 未知の値だった場合のフォールバック
    switch (type) {
      case 'text':      return TypeIcon;
      case 'code':      return CodeIcon;
      case 'image':     return ImageIcon;
      case 'markdown':  return NotebookPenIcon;
      case 'math':      return SigmaIcon;
      default:          return Plus; // 想定外の type には「＋」アイコンを表示
    }
  };

  // ---- 特定 type を非表示にすべきか判定 ----
  // hiddenBlockTypes に含まれる / Prop で禁止されている場合は true を返す
  const isTypeHidden = (type: CardBlock['type']) => {
    if (hiddenBlockTypes.includes(type)) return true;
    return false;
  };

  // ---- 実際に表示するブロック設定を絞り込む ----
  // isVisible / enabled のどちらも未設定なら表示する（true がデフォルト）
  const visibleConfigs = blockSettings.filter((config) => {
    const isVisible = config.isVisible ?? config.enabled ?? true;
    if (!isVisible)          return false;
    if (isTypeHidden(config.type)) return false;
    return true;
  });

  // ---- カラーテーマキー → Tailwind クラス の対応表 ----
  // Tailwind は動的クラス名を認識できないため、ここで完全なクラス文字列を列挙する必要がある
  const colorMap: Record<string, string> = {
    primary: 'hover:shadow-primary-500/20 hover:text-primary-600',
    indigo:  'hover:shadow-indigo-500/30 hover:text-indigo-600',
    emerald: 'hover:shadow-emerald-500/30 hover:text-emerald-600',
    cyan:    'hover:shadow-cyan-500/30 hover:text-cyan-600',
    rose:    'hover:shadow-rose-500/30 hover:text-rose-600',
    purple:  'hover:shadow-purple-500/30 hover:text-purple-600',
    slate:   'hover:shadow-slate-500/20 hover:text-slate-600',
  };

  return (
    <div className={cn("mb-1.5 md:mb-2", className)}>

      {/* =====================================================
          モバイル (<md): 「追加」ボタン1つ → ドロップダウンで種別選択
          画面が狭いため、全ボタンを並べず DropdownMenu に集約する
         ===================================================== */}
      <div className="flex md:hidden items-center gap-2">
        {/* ラベルバッジ */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/50 rounded-full border border-slate-200/50">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            {label}
          </span>
        </div>

        {/* ドロップダウントリガー */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-6 px-2.5 rounded-full bg-white text-slate-600 font-bold text-[10px]",
                "inline-flex items-center gap-1",
                "shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-slate-200/60",
                "active:scale-95 transition-all"
              )}
              aria-label={`${label} にブロックを追加`}
            >
              <Plus className="w-3 h-3" />
              <span className="leading-none">追加</span>
            </button>
          </DropdownMenuTrigger>

          {/* ドロップダウンの中身：visibleConfigs を 1行ずつリスト表示 */}
          <DropdownMenuContent
            align="start"
            className="rounded-2xl border-slate-100 shadow-xl p-2 min-w-[220px]"
          >
            {visibleConfigs.length === 0 ? (
              // 表示できるブロックが0件の場合のフォールバックメッセージ
              <div className="px-2 py-2 text-xs text-slate-400">追加できるブロックがありません</div>
            ) : (
              visibleConfigs.map((config) => {
                const Icon = getIcon(config.icon, config.type);
                return (
                  <DropdownMenuItem
                    key={config.type}
                    onClick={() => onAddBlock(config.type)} // 選択時にブロック追加を親に通知
                    className={cn(
                      "rounded-xl flex items-center gap-2 py-2",
                      "text-slate-600 focus:text-slate-800"
                    )}
                  >
                    {/* アイコン */}
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

      {/* =====================================================
          デスクトップ (md+): ブロック種別ボタンを横並びで全表示
          overflow-x-auto + no-scrollbar で画面幅が足りない場合もスクロール可能
         ===================================================== */}
      <div className="hidden md:flex md:items-center md:gap-1.5 md:flex-nowrap md:overflow-x-auto no-scrollbar">
        {/* ラベルバッジ（モバイルと同じ見た目） */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/50 rounded-full border border-slate-200/50 shrink-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            {label}
          </span>
        </div>

        {/* ブロック追加ボタンを種別ごとに並べる */}
        <div className="flex items-center gap-1 shrink-0">
          {visibleConfigs.map((config) => {
            const Icon = getIcon(config.icon, config.type);
            return (
              <button
                key={config.type}
                type="button"
                onClick={() => onAddBlock(config.type)} // クリックでブロック追加を親に通知
                className={cn(
                  "group flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-white text-slate-500 transition-all shrink-0",
                  "active:scale-95 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md border border-transparent",
                  colorMap[config.color || 'primary'] // カラーテーマを適用
                )}
                aria-label={`${config.label}を追加`}
              >
                <Icon className="w-3 h-3" />
                <span className="text-[9px] font-bold leading-none">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
