import React from 'react';

export interface CodeBlockFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  languageLabel?: string;
  right?: React.ReactNode; // 編集なら言語Select、閲覧ならCopyボタン等
  children: React.ReactNode;
}

/**
 * 全画面統一のコードブロックフレーム
 * - 外枠: codeBlockRoot
 * - 言語ラベル: codeBlockLang（左上）
 * - 右上アクション: right
 * - 内容領域: children（呼び出し側で pre / Editor を置く）
 */
export const CodeBlockFrame: React.FC<CodeBlockFrameProps> = ({
  languageLabel,
  right,
  children,
  className,
  ...divProps
}) => {
  return (
    <div
      {...divProps}
      className={`codeBlockRoot relative group overflow-hidden ${className || ''}`}
    >
      {languageLabel && (
        <div className="absolute left-[10px] top-2.5 z-20 pointer-events-none">
          <span className="codeBlockLang">{languageLabel}</span>
        </div>
      )}

      {right && <div className="absolute right-2.5 top-2.5 z-20">{right}</div>}

      {children}
    </div>
  );
};