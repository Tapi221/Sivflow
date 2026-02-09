# 同期システムおよびUI安定化の実装計画

本計画では、「同期エラーに伴う画面空白化」の根本原因である無限再帰の修正、および同期システムの回復力を向上させるための改善を実施します。

## 概要
1. **無限再帰ガードの導入**: フォルダ階層計算時の循環参照を検知・遮断し、UIクラッシュを防止。
2. **Error Boundaryの導入**: 予期せぬエラー時にアプリ全体が空白になるのを防ぎ、リカバリ手段を提供。
3. **同期リカバリ機能の強化**: 実装が省略されていた「フル同期」の実装を完了させ、不整合を自動修復可能にする。

## 変更内容

### [Component] UI Stability (UI安定化)

#### [MODIFY] [FolderTree.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTree.tsx)
- `getCardCount` 関数に `visited` セットを導入し、循環参照を検知した場合に再帰を停止する。

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- `getDescendantStats` 関数にループ防止ロジックを追加。

#### [MODIFY] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- `totalDescendantCardCount` および `getDescendantIds` にループ防止ロジックを追加。

#### [NEW] [ErrorBoundary.tsx](file:///c:/FlashcardMaster/src/Components/common/ErrorBoundary.tsx)
- React Error Boundary コンポーネントを作成。
- クラッシュ時に「再読み込み」や「キャッシュクリア」を提案する画面を表示。

#### [MODIFY] [App.tsx](file:///c:/FlashcardMaster/src/App.tsx)
- 全体を `ErrorBoundary` でラップし、致命的なエラーから復旧可能にする。


### [Component] Sync System (同期システム)

#### [MODIFY] [SyncServiceV2.ts](file:///c:/FlashcardMaster/src/services/SyncServiceV2.ts)
- `forceFullResync` の実装。
- `cloudAdapter.pullDiff(0)` で全データを取得し、ローカルDBをクリーンな状態で再構築する（既存データのバックアップを推奨しつつ）。

#### [MODIFY] [DiffEngine.ts](file:///c:/FlashcardMaster/src/services/logic/DiffEngine.ts)
- 親子関係の更新時に循環参照が発生しないかチェックするバリデーションを追加。


## 検証計画

### 1. 循環参照のテスト
- コンソールから手動で IndexedDB 内に循環参照（A.parent = B, B.parent = A）を作成し、画面が空白にならずに「ループを検知した」等の表示（または単に無限ループが止まること）を確認する。

### 2. 同期エラーのシミュレート
- ネットワークを遮断したり、マージ競合を発生させたりして、同期状態が `error` になった際に UI が正常に動作（閲覧可能）し続けることを確認する。

### 3. クラッシュ復旧テスト
- コンポーネント内で意図的に `throw new Error()` を発生させ、`ErrorBoundary` がキャッチして復旧用 UI を表示することを確認する。
