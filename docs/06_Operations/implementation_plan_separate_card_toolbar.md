# 実装計画：カードツールバーと外枠の分離

カード編集画面において、ツールバー（ブロック追加ボタン群）をカードの外（枠線の外）に配置し、カードとしての視覚的境界を明確にします。

## 提案事項

### 1. CardShell の構造変更
- **[MODIFY] [CardShell.tsx](file:///c:/FlashcardMaster/src/Components/card/CardShell.tsx)**
  - 枠線、角丸、背景色を適用する「カードフレーム」層を新設します。
  - `actionsTopLeft`, `actionsTopRight` をこのフレームの外側に配置可能にします。
  - 角丸のクリップ用に `overflow-hidden` はフレームに持たせますが、**スクロール（max-height/overflow:auto）は必ず内部の `.card-shell-body` が担当するようにします**。

### 2. スタイルの移行
- **[MODIFY] [index.css](file:///c:/FlashcardMaster/src/index.css)**
  - `.card-shell` にあった見た目に関するスタイルを `.card-shell-frame` に移します。
  - `.card-shell-body` のスクロール挙動を維持します。

### 3. BlockEditor のリファクタリング
- **[NEW] [BlockToolbar.tsx](file:///c:/FlashcardMaster/src/Components/card/BlockToolbar.tsx)**
  - ツールバーを純粋なUIコンポーネントとして抽出します。
- **[MODIFY] [BlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/BlockEditor.tsx)**
  - 抽出した `BlockToolbar` を使用するように変更します。
  - **ブロックの挿入ロジックや、クリック後のフォーカス管理（編集位置への復帰）は `BlockEditor` 側に残します。**

### 4. CardEditor のレイアウト調整
- **[MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)**
  - `BlockToolbar` を `CardShell` の外（または `actionsTopLeft` slot）に配置し、カード枠より上に表示されるようにします。

## 検証計画

### 自動テスト
- `npm run build` でビルドが通ることを確認。

### 手動確認
- **編集画面**: ツールバーがカード枠の外に出ており、カードの枠線がその下から始まっていることを確認。
- **プレビューモード**: プレビュー時にはツールバーが表示されず、カードのみが表示されることを確認。
- **既存表示（一覧・閲覧）**: デザインが崩れていないか確認。
- **罫線**: 罫線がカード内部にのみ表示され、ツールバーの背面にはみ出していないことを確認。
