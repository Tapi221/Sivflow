import React from 'react';

type CodeBlockFrameProps = {
  languageLabel?: string;
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
  left,
  right,
  children,
}) => {
  return (
    <div className="codeBlockRoot relative group overflow-hidden">
      {languageLabel && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{ left: 'var(--code-tools-inset)', top: 'var(--code-tools-top)' }}
        >
          <span className="codeBlockLang">{languageLabel}</span>
        </div>
      )}

      {left && (
        <div
          className="absolute z-20"
          style={{ left: 'var(--code-tools-inset)', top: 'var(--code-tools-top)' }}
        >
          {left}
        </div>
      )}

      {right && (
        <div
          className="absolute z-20"
          style={{ right: 'var(--code-tools-inset)', top: 'var(--code-tools-top)' }}
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
