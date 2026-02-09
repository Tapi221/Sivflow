# 入力時のズーム防止（再修正） 実装計画

## 概要
前回 `text-base md:text-sm` (モバイルのみ16px) と設定しましたが、ユーザーより「まだ拡大表示される」との指摘がありました。
iPad等のタブレット端末や、高解像度スマホでの挙動、あるいは特定のブラウザでの挙動により `text-sm` (14px) が適用されてしまっている可能性があります。
確実にズームを防ぐため、レスポンシブな切り替えを廃止し、入力欄のフォントサイズを常時 **16px (`text-base`)** に統一します。

## 変更内容

### 1. src/Components/card/blocks/TextBlock.tsx
現状: `className="... text-base md:text-sm ..."`
変更: `className="... text-base ..."`
- `md:text-sm` を削除し、常時 16px を強制します。

### 2. src/Components/card/blocks/MathBlock.tsx
現状: `className="... text-base md:text-sm ..."`
変更: `className="... text-base ..."`
- 同様に `md:text-sm` を削除し、常時 16px を強制します。

### 3. src/Components/ui/AutoResizeTextarea.tsx
現状: `className="... text-sm ..."`
変更: `className="... text-base ..."`
- デフォルトのテキストエリアも `text-sm` (14px) が指定されているため、これも `text-base` (16px) に変更し、アプリ全体でテキストエリア入力時のズーム定を防ぎます。

## 検証計画

### 手動検証
1.  **モバイル/デスクトップ表示確認**
    - どの画面幅（スマホ、タブレット、PC）でも、テキストブロック・数式ブロックの文字サイズが 16px であることを確認。
    - 入力欄をタップ/クリックしても拡大（ズーム）されないことを確認。
