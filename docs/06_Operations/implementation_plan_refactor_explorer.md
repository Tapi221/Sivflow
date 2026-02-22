# 実装計画：ExplorerコンポーネントのリファクタリングとDnD改善

`FolderTreeWithCards.tsx` は現在1600行を超える巨大なファイルになっており、メンテナンス性が低下しています。本計画では、このファイルを責務ごとに分割し、同時にドラッグ＆ドロップ（DnD）時の「横ブレ」を抑制する改修を行います。

## 背景と目的
- **現状の課題**: `FolderTreeWithCards.tsx` が肥大化し、ロジックの追跡が困難。DnD中にカードが左右に揺れる（横ブレ）挙動があり、操作性が悪い。
- **解決策**: コンポーネントの分割、純粋関数の外出し、DnDスタイルの加工による縦移動の強制。

## 変更内容

### 1. 調査と即時修正 (Step 0)
- **CSSチェック**: `DragDropContext` を包む親〜祖先に `transform`, `filter`, `perspective` が付いていないか確認。
- **即時修正**: `FolderTreeWithCards.tsx` 内に `lockToVerticalTransform` 関数を導入し、`renderCard` で適用して横ブレを解消。

### 2. コンポーネントと関数の移動

#### [NEW] `src/Components/folder/explorer/model/utils.ts`
- `getFolderId`, `getParentFolderId` などのフォルダ操作ユーティリティ。
- `createDocumentId`, `isTextInputTarget` などの共通ロジック。

#### [NEW] `src/Components/folder/explorer/dnd/lockToVertical.ts`
- `lockToVerticalTransform` を正式に移植。

#### [NEW] `src/Components/folder/explorer/rows/DocumentRow.tsx`
- `renderDocument` のロジックをコンポーネントとして独立。

#### [NEW] `src/Components/folder/explorer/rows/CardRow.tsx`
- `renderCard` のロジックを移植。`lockToVerticalTransform` をスタイルに適用。

#### [NEW] `src/Components/folder/explorer/rows/FolderRow.tsx`
- `renderFolder` のロジックを移植。再帰的構造の管理。

#### [MODIFY] `src/Components/folder/FolderTreeWithCards.tsx`
- 司令塔としての責務（state管理、イベント管理）に集中し、描画ロジックを各 Row コンポーネントに委譲。

## 検証計画
- **DnD 挙動**: カードをドラッグした際、横方向にブレず、縦方向にのみスムーズに移動すること。
- **機能維持**: フォルダ開閉、名前変更、削除、ピン留め、PDFアップロード等の既存機能が正常であること。
- **ビルド確認**: `npm run typecheck` でエラーがないこと。
