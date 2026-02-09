# IDEエラー解消 実装計画

## 概要
`MediaUploader.tsx` および `FolderMemo.tsx` で報告されているIDEエラー（アクセシビリティ、重複ID、インラインスタイル）を解消する。

## 変更内容

### 1. `src/Components/card/MediaUploader.tsx`

#### [MODIFY] MediaUploader.tsx
- **重複IDの解消**:
    - `React.useId()` を使用してユニークIDを生成する。
    - ID形式: `file-input-${type}-${uniqueId}`
- **アクセシビリティ対応**:
    - `input` 要素に `aria-label` を追加し、視覚的な補助テキストとの整合性を取る。
- **インラインスタイルの方針**:
    - プログレスバーの動的 `width` などは、無理にクラス化せず `style` 属性を使用する。

### 2. `src/Components/folder/FolderMemo.tsx`

#### [MODIFY] FolderMemo.tsx
- **アクセシビリティ対応**:
    - 削除ボタン等のアイコンのみのボタンに `aria-label` を追加。
    - ファイル入力にも `aria-label` を追加。
- **インラインスタイルの方針**:
    - アクセントカラーの動的適用は、`style={{ backgroundColor: accentColor }}` のように直接指定し、確実性を優先する。無理なCSS変数化は避ける。

## 検証計画
- コード変更後、再度同様のエラー/警告が表示されないか確認（ツール上での確認はできないため、目視確認）。
- アプリケーションが正常にビルド・動作することを確認。
    - 画像アップロードが機能するか。
    - フォルダメモのスタイル（アクセントカラー）が正しく適用されるか。
