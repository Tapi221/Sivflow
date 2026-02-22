# 実装計画：トグルスイッチのUI改善（プレミアム化）

「デカくてださい」というフィードバックに対し、iOSのような洗練された、かつ主張しすぎないモダンなトグルデザインに刷新します。

## デザインの変更点

### 1. 共通 Switch コンポーネントのスリム化

- **サイズ変更**:
  - トラック: `h-5 w-8` (20x32px) → `h-4 w-7` (16x28px)
  - つまみ (Thumb): `h-3.5 w-3.5` → `h-2.5 w-2.5`
- **配色調整**:
  - Unchecked: `bg-slate-200` → `bg-slate-100` (より背景に溶け込む)
  - Checked: `bg-primary` → アクセントカラーに対応した透過度のある配色、またはよりソフトな中庸色。
- **アニメーション**: スプリング感を僅かに持たせた滑らかな遷移。

### 2. CardEditor での「作成中」トグルの改善

- **コンテナの軽量化**: `h-14` の重厚な枠を廃止し、より繊細な境界線またはアイコンベースの表示に。
- **ラベルのフォント調整**: 小さく、トラッキング（字間）を広げて、洗練された印象に。

## 修正対象ファイル

### [switch.tsx](file:///c:/FlashcardMaster/src/Components/ui/switch.tsx)

- クラス定義を `h-4 w-7` 等に変更。
- フォーカスリングをより細く（控えめに）。

### [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)

- 「作成中」セクションのパディング、境界線、フォントを控えめに調整。

### [SettingsDialog.jsx](file:///c:/FlashcardMaster/src/Components/settings/SettingsDialog.jsx)

- 設定画面内のトグルが並ぶ箇所のマージン・パディングを整理し、全体的にコンパクトな印象に。

## 検証計画

- 各画面（CardEditor, Settings, SyncSettings等）でトグルが正しく機能し、視覚的に改善されているかを確認。
- モバイル表示でタップしにくくなっていないか（最低限のヒットエリアは確保）を確認。
