# Walkthrough: Explorer コンポーネントのリファクタリングと DnD 改善

`FolderTreeWithCards.tsx` の肥大化解消と、ドラッグ＆ドロップ時の「横揺れ」抑制のためのリファクタリングが完了しました。

## 実施内容

### 1. コンポーネントの分解
1600行を超えていた `FolderTreeWithCards.tsx` から描画ロジックとユーティリティを抽出し、以下の構造に整理しました。

- **`explorer/model/utils.ts`**: フォルダ/ドキュメント操作の純粋関数群。
- **`explorer/dnd/lockToVertical.ts`**: DnD 中の横移動を抑制する座標ロックロジック。
- **`explorer/rows/FolderRow.tsx`**: フォルダ行の描画と再帰管理。
- **`explorer/rows/CardRow.tsx`**: カード行の描画（DnD 対応）。
- **`explorer/rows/DocumentRow.tsx`**: PDF/ドキュメント行の描画。

### 2. DnD の横揺れ改善
`Draggable` のスタイルに含まれる `transform` を動的に加工する `lockToVerticalTransform` を導入しました。これにより、複雑なスタイルが当たっている環境下でも、ドラッグ中の `translateX` を強制的に `0px` に固定し、安定した縦方向の移動を実現しました。

```typescript
// lockToVertical.ts の核心部
const lockToVerticalTransform = (style: any) => {
  if (!style?.transform) return style;
  // 他の transform (scale等) を維持しつつ translate の x だけを 0 に置換
  const newTransform = style.transform.replace(/translate(3d)?\([^,]+,/, 'translate$1(0px,');
  return { ...style, transform: newTransform };
};
```

### 3. コードの軽量化
- `FolderTreeWithCards.tsx` の行数が約 300 行削減され、司令塔としてのロジックが見通しやすくなりました。
- 各 Row コンポーネントが自身のコンテキストメニューや編集状態を管理するようになり、責務が明確化されました。

## 検証結果

- **ビルド確認**: `npm run typecheck` パス。
- **DnD 安定性**: 横ぶれが完全に消失し、ドラッグ中の揺れが改善されたことを確認。
- **機能維持**: フォルダの再帰的な展開、インプレース編集、ピン留め、削除、ファイルドロップによる PDF アップロード機能が正常に動作し、既存のユーザー体験が維持されていることを確認しました。

## 成果物
- [implementation_plan_refactor_explorer.md](file:///c:/FlashcardMaster/docs/06_Operations/implementation_plan_refactor_explorer.md)
- [FolderTreeWithCards.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTreeWithCards.tsx)
- row components: `FolderRow.tsx`, `CardRow.tsx`, `DocumentRow.tsx`
- utils: `utils.ts`, `lockToVertical.ts`
