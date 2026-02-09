# 設定画面のブロック並び替え挙動の改善

設定画面のブロックエディタ設定において、並び替えがスムーズに行われない問題を修正します。

## 課題
現状の実装では、`handleDragEnd` でローカルステートを更新した直後に DB（Dexie）を更新していますが、DB の更新が `useLiveQuery` を通じて `settings` オブジェクトに反映されるまでの間に、古いデータに基づいた再レンダリングが発生し、「一旦戻ってから反映される」ようなチラツキやジャンプが発生している可能性が高いです。

## 解決策

### 1. 同期ロジックの改善
- `isDraggingRef` の管理をより厳密に行い、DB 更新中も外部からのステート上書きを防ぎます。
- `handleDragEnd` を `async` 化し、`updateSettings` の完了を待ってから `isDraggingRef` を `false` に戻します。

### 2. スタイルの微調整
- ドラッグ中の `shadow` や `scale` を調整し、より滑らかな視認性を確保します。
- `transition` の適用タイミングを最適化します。

## 実施内容

### [BlockOrdering.tsx](file:///c:/FlashcardMaster/src/Components/settings/BlockOrdering.tsx)
- `handleDragEnd` を `async` 化し、DB 更新完了まで `isDraggingRef` を `true` に保つことで、`useLiveQuery` による古いデータの引き戻しを防止します。
- レイアウトの微調整。

## 検証計画
1. 設定画面を開き、ブロックをドラッグして並び替える。
2. 配置が確定する際にアイテムがジャンプしたり、一瞬古い位置に戻ったりしないことを確認する。
3. リロード後も正しく並び順が保持されていることを確認する。
