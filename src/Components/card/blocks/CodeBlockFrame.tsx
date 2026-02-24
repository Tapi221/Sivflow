import React from 'react';

type CodeBlockFrameProps = {
  languageLabel?: string;
  right?: React.ReactNode; // 編集なら言語Select、閲覧ならCopyボタン等
  children: React.ReactNode;
};

/**
 * 全画面統一のコードブロックフレーム
 * 
 * - 外枠: codeBlockRoot
 * - 言語ラベル左上配置: codeBlockLang
 * - アクション領域右上配置: right prop
 * - 内容領域: children（code-block-pre code-block-pre--tools）
 */
export const CodeBlockFrame: React.FC<CodeBlockFrameProps> = ({
  languageLabel,
  right,
  children,
}) => {
  return (
    <div className="codeBlockRoot relative group overflow-hidden">
      {/* 左上：言語ラベル */}
      {languageLabel && (
        <div className="absolute left-[10px] top-2.5 z-20 pointer-events-none">
          <span className="codeBlockLang">{languageLabel}</span>
        </div>
      )}

      {/* 右上：アクション（コピーボタン、言語セレクタなど） */}
      {right && <div className="absolute right-2.5 top-2.5 z-20">{right}</div>}

      {/* コンテンツ領域 */}
      <div className="code-block-pre code-block-pre--tools relative">
        {children}
      </div>
    </div>
  );
};