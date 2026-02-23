import React from 'react';
import {
  Plus,
  Volume2,
  StickyNote
} from 'lucide-react';
import TypeIcon from 'lucide-react/dist/esm/icons/type';
import CodeIcon from 'lucide-react/dist/esm/icons/code';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import SigmaIcon from 'lucide-react/dist/esm/icons/sigma';
import NotebookPenIcon from 'lucide-react/dist/esm/icons/notebook-pen';
import { cn } from '@/lib/utils';
import type { CardBlock } from '@/types';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

interface BlockToolbarProps {
  label: string;
  onAddBlock: (type: CardBlock['type']) => void;
  settings?: any;
  canAddLink?: boolean;
  canAddAudio?: boolean;
  hiddenBlockTypes?: CardBlock['type'][];
  className?: string;
}

type BlockConfig = {
  type: CardBlock['type'];
  label: string;
  icon?: string;
  isVisible?: boolean;
  enabled?: boolean;
  color?: string;
};

const ALLOWED_TYPES: readonly CardBlock['type'][] = [
  'text',
  'code',
  'image',
  'audio',
  'reference',
  'markdown',
  'math',
  'memo',
] as const;

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  label,
  onAddBlock,
  settings,
  canAddLink = true,
  canAddAudio = true,
  hiddenBlockTypes = [],
  className
}) => {
  // 設定から表示するブロックの順序や有無を取得（デフォルト値も定義）
  // UserSettings の editorBlockSettings は isVisible プロパティを使用していることに注意
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
          { type: 'text', label: 'テキスト', icon: 'Type', isVisible: true, color: 'primary' },
          { type: 'code', label: 'コード', icon: 'Code', isVisible: true, color: 'indigo' },
          { type: 'image', label: '画像', icon: 'Image', isVisible: true, color: 'emerald' },
          { type: 'audio', label: '音声', icon: 'Volume2', isVisible: true, color: 'amber' },
          { type: 'reference', label: 'リンク', icon: 'Link', isVisible: true, color: 'cyan' },
          { type: 'markdown', label: 'Markdown', icon: 'NotebookPen', isVisible: true, color: 'rose' },
          { type: 'math', label: '数式', icon: 'Sigma', isVisible: true, color: 'purple' },
          { type: 'memo', label: 'メモ', icon: 'StickyNote', isVisible: true, color: 'slate' }
        ];

  const getIcon = (iconName: string | undefined, type: CardBlock['type']) => {
    // まず指定された iconName があれば優先してマッピング
    if (iconName) {
      switch (iconName) {
        case 'Type': return TypeIcon;
        case 'Image': return ImageIcon;
        case 'Link': return LinkIcon;
        case 'Sigma': return SigmaIcon;
        case 'Code': return CodeIcon;
        case 'StickyNote': return StickyNote;
        case 'Volume2': return Volume2;
        case 'NotebookPen': return NotebookPenIcon;
      }
    }

    // iconName が無い、またはマッピングに失敗した場合は type から推測
    switch (type) {
      case 'text': return TypeIcon;
      case 'code': return CodeIcon;
      case 'image': return ImageIcon;
      case 'audio': return Volume2;
      case 'reference': return LinkIcon;
      case 'markdown': return NotebookPenIcon;
      case 'math': return SigmaIcon;
      case 'memo': return StickyNote;
      default: return Plus;
    }
  };

  const isTypeHidden = (type: CardBlock['type']) => {
    if (hiddenBlockTypes.includes(type)) return true;
    if (type === 'reference' && !canAddLink) return true;
    if (type === 'audio' && !canAddAudio) return true;
    return false;
  };

  const visibleConfigs = blockSettings.filter((config) => {
    const isVisible = config.isVisible ?? config.enabled ?? true;
    if (!isVisible) return false;
    if (isTypeHidden(config.type)) return false;
    return true;
  });

  const colorMap: Record<string, string> = {
    primary: 'hover:shadow-primary-500/20 hover:text-primary-600',
    indigo: 'hover:shadow-indigo-500/30 hover:text-indigo-600',
    emerald: 'hover:shadow-emerald-500/30 hover:text-emerald-600',
    amber: 'hover:shadow-amber-500/30 hover:text-amber-600',
    cyan: 'hover:shadow-cyan-500/30 hover:text-cyan-600',
    rose: 'hover:shadow-rose-500/30 hover:text-rose-600',
    purple: 'hover:shadow-purple-500/30 hover:text-purple-600',
    slate: 'hover:shadow-slate-500/20 hover:text-slate-600',
  };

  return (
    <div className={cn("mb-1.5 md:mb-2", className)}>
      {/* =========================
         Mobile (<md): 「＋」だけ出してメニューで追加（案3）
         ========================= */}
      <div className="flex md:hidden items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/50 rounded-full border border-slate-200/50">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            {label}
          </span>
        </div>

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
              title="ブロックを追加"
            >
              <Plus className="w-3 h-3" />
              <span className="leading-none">追加</span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="rounded-2xl border-slate-100 shadow-xl p-2 min-w-[220px]"
          >
            {visibleConfigs.length === 0 ? (
              <div className="px-2 py-2 text-xs text-slate-400">追加できるブロックがありません</div>
            ) : (
              visibleConfigs.map((config) => {
                const Icon = getIcon(config.icon, config.type);
                return (
                  <DropdownMenuItem
                    key={config.type}
                    onClick={() => onAddBlock(config.type)}
                    className={cn(
                      "rounded-xl flex items-center gap-2 py-2",
                      "text-slate-600 focus:text-slate-800"
                    )}
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

      {/* =========================
         Desktop (md+): 従来のボタン並び（案1,2の要素を軽く反映）
         - wrapは許可（画面狭いときの保険）
         - 文字はそのまま、でもサイズは少し控えめ
         ========================= */}
      <div className="hidden md:flex md:items-center md:gap-1.5 md:flex-nowrap md:overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/50 rounded-full border border-slate-200/50 shrink-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            {label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {visibleConfigs.map((config) => {
            const Icon = getIcon(config.icon, config.type);
            return (
              <button
                key={config.type}
                type="button"
                onClick={() => onAddBlock(config.type)}
                className={cn(
                  "group flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-white text-slate-500 transition-all shrink-0",
                  "active:scale-95 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md border border-transparent",
                  colorMap[config.color || 'primary']
                )}
                title={`${config.label}を追加`}
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
