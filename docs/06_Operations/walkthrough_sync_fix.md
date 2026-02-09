# 同期エラーとUIクラッシュ問題の修正ウォークスルー

同期エラーによってフォルダ構造に循環参照が発生し、UIが無限再帰でクラッシュ（画面が真っ白になる）する問題、および同期システム自体の安定性を向上させる修正を行いました。

## 実施した主な修正

### 1. 無限再帰ガードの導入
フォルダ階層の計算ロジック（カード数カウント等）において、循環参照が発生しても無限ループに陥らないよう `visited` セットによるガードを追加しました。

- [FolderTree.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTree.tsx)
- [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)

```javascript
const getCardCount = (folderId, visited = new Set()) => {
  if (visited.has(folderId)) return 0; // 循環を検知して停止
  visited.add(folderId);
  // ...
};
```

### 2. Error Boundary (エラー境界) の導入
予期せぬエラーでコンポーネントがクラッシュした場合でも、アプリ全体が真っ白になるのを防ぎ、ユーザーが自身で「キャッシュクリア」や「再読み込み」を行える復旧UIを表示するようにしました。

- [ErrorBoundary.tsx](file:///c:/FlashcardMaster/src/Components/common/ErrorBoundary.tsx)
- [App.tsx](file:///c:/FlashcardMaster/src/App.tsx)

### 3. 同期エンジンの強化
同期中（マージ時）に循環参照が発生することを未然に防ぐチェックロジックを追加し、また完全に不整合が起きた場合の最終手段として「フル同期（全取得）」機能を実装しました。

- [DiffEngine.ts](file:///c:/FlashcardMaster/src/services/logic/DiffEngine.ts): `detectCycle` メソッドの追加
- [SyncServiceV2.ts](file:///c:/FlashcardMaster/src/services/SyncServiceV2.ts): 
    - `applyRemoteChanges` での循環参照自動回避
    - `forceFullResync`（クラウドデータをマスターとした再構築）の実装

## 検証結果
- [x] 無限再帰ガードが正常に動作し、循環参照データがあってもスタックオーバーフローしないことを確認。
- [x] ErrorBoundary がアプリの最上位で動作し、クラッシュをキャッチできる準備が整った。
- [x] `forceFullResync` により、ローカルデータを破棄してクラウドから最新状態を復元できるロジックが正常にビルドされることを確認。

> [!IMPORTANT]
> 万が一画面が真っ白になった場合は、ErrorBoundary が提供する「キャッシュをクリアして修復」ボタンを使用することで、クラウドとの再同期を伴うクリーンな状態から再開できます。
