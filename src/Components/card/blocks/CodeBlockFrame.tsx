import React from 'react';

type CodeBlockFrameProps = {
  /** Notion風: 表示は短縮(例: JS/TS/PY) */
  languageLabel?: string;
  /** hover / a11y 用のフル名(例: JavaScript/TypeScript) */
  languageTitle?: string;

  left?: React.ReactNode; // 編集なら言語Select等
  right?: React.ReactNode; // 編集なら言語Select、閲覧ならCopyボタン等
  children: React.ReactNode;
};

/**
 * 全画面統一のコードブロックフレーム
 *
 * - 外枠: codeBlockRoot
 * - 言語ラベル左上配置: codeBlockLang
 * - アクション領域右上配置: right prop
 * - 内容領域: children（codeBlockPre codeBlockPre--tools）
 */
export const CodeBlockFrame: React.FC<CodeBlockFrameProps> = ({
  languageLabel,
  languageTitle,
  left,
  right,
  children,
}) => {
  const showLangLabel = !!languageLabel && !left; // left(Select) があると被るので抑止

  return (
    <div className="codeBlockRoot relative group overflow-hidden">
      {showLangLabel && (
        <div
          className="absolute z-20"
          style={{ left: 'var(--code-tools-inset)', top: 'var(--code-tools-top)' }}
          // ラベルクリックで親のカード選択やD&Dに干渉しにくくする
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title={languageTitle ?? languageLabel}
          aria-label={`Language: ${languageTitle ?? languageLabel}`}
        >
          <span className="codeBlockLang">{languageLabel}</span>
        </div>
      )}

      {left && (
        <div
          className="absolute z-20"
          style={{ left: 'var(--code-tools-inset)', top: 'var(--code-tools-top)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {left}
        </div>
      )}

      {right && (
        <div
          className="absolute z-20"
          style={{ right: 'var(--code-tools-inset)', top: 'var(--code-tools-top)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {right}
        </div>
      )}

      <div className="codeBlockPre codeBlockPre--tools relative">
        {children}
      </div>
    </div>
  );
};