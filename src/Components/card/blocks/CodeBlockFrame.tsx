import React from 'react';
import { CARD_ROW_PX } from '@/Components/card/constants';
import { RowSnappedRoot } from '@/Components/card/RowSnappedRoot';

type CodeBlockFrameProps = {
  variant?: 'viewer' | 'editor';
  /** Notion風: 表示は短縮(例: JS/TS/PY) */
  languageLabel?: string;
  /** hover / a11y 用のフル名(例: JavaScript/TypeScript) */
  languageTitle?: string;

  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * 全画面統一のコードブロックフレーム
 *
 * - 外枠: codeBlockRoot
 * - 言語ラベル左上配置: codeBlockLang
 * - ヘッダ: headerLeft / headerRight
 * - 内容領域: codeBlockBody（横スクロール責務を一元化）
 */
export const CodeBlockFrame: React.FC<CodeBlockFrameProps> = ({
  variant = 'viewer',
  languageLabel,
  languageTitle,
  headerLeft,
  headerRight,
  children,
}) => {
  const showLangLabel = !!languageLabel && !headerLeft; // 左側ヘッダがあると被るので抑止

  return (
    <RowSnappedRoot
      rowPx={CARD_ROW_PX}
      className={`codeBlockRoot codeBlockRoot--${variant} relative group overflow-hidden`}
    >
      {showLangLabel && (
        <div
          className="absolute z-20"
          style={{ left: 'var(--code-header-inset-x)', top: 'var(--code-header-inset-y)' }}
          // ラベルクリックで親のカード選択やD&Dに干渉しにくくする
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Language: ${languageTitle ?? languageLabel}`}
        >
          <span className="codeBlockLang">{languageLabel}</span>
        </div>
      )}

      {headerLeft && (
        <div
          className="absolute z-20"
          style={{ left: 'var(--code-header-inset-x)', top: 'var(--code-header-inset-y)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {headerLeft}
        </div>
      )}

      {headerRight && (
        <div
          className="absolute z-20"
          style={{ right: 'var(--code-header-inset-x)', top: 'var(--code-header-inset-y)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {headerRight}
        </div>
      )}

      <div className="codeBlockBody codeBlockBody--withHeader relative">
        {children}
      </div>
    </RowSnappedRoot>
  );
};
