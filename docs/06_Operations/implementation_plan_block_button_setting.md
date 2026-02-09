# ブロックボタン表示設定の実装計画

## 概要
カード編集画面のブロック追加ボタンにおいて、ラベル（テキスト）の表示/非表示を設定画面から切り替えられるようにします。デフォルトは「表示」（現在のレスポンシブ挙動）とし、設定により「アイコンのみ」固定にできるようにします。

## 変更内容

### 1. 設定画面 (`src/Components/settings/SettingsDialog.jsx`)
*   [学習設定] タブに新しい設定項目を追加します。
    *   **項目名**: ブロック追加ボタンのラベル表示
    *   **説明**: 編集画面のツールバーで、ボタンの機能名（テキスト）を表示します
    *   **設定キー**: `settings.blockButtonShowLabel` (デフォルト: `true`)

### 2. ブロックエディタ (`src/Components/card/BlockEditor.tsx`)
*   `useUserSettings` から `settings.blockButtonShowLabel` を読み込みます。
*   ボタンのクラス名とテキスト要素の表示ロジックを修正します。
    *   **ラベル表示 ON の場合**: 現在のレスポンシブ挙動を維持（画面幅に応じてテキスト表示/非表示切り替え）。
    *   **ラベル表示 OFF の場合**: 常にアイコンのみ表示（テキスト非表示、幅固定）。

## 詳細ロジック
`BlockEditor.tsx` 内のボタンレンダリング部分:

```tsx
const showLabel = settings?.blockButtonShowLabel ?? true;

// クラス名の切り替え
const buttonClass = showLabel
  ? "w-8 md:w-auto lg:w-8 xl:w-auto px-0 md:px-4 lg:px-0 xl:px-4" // 現在の挙動
  : "w-8 px-0"; // 常に円形/アイコンのみ

// テキスト要素の切り替え
const textClass = showLabel
  ? "hidden md:inline lg:hidden xl:inline" // 現在の挙動
  : "hidden"; // 常に非表示
```

## 検証計画
### 手動検証
1.  **設定変更**: 設定画面 > 学習設定 で「ブロック追加ボタンのラベル表示」スイッチを切り替え、設定が保存されることを確認。
2.  **表示確認（ON）**: スイッチONの状態で編集画面を開き、PCサイズで「アイコン＋テキスト」が表示されることを確認。
3.  **表示確認（OFF）**: スイッチOFFに変更し、編集画面で「アイコンのみ」が表示され、ボタンが正円に近い形状であることを確認。
