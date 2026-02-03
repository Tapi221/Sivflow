# 不具合修正：Firestore 保存エラー（命名競合およびインポートミス）の解決計画 (改訂版)

## 概要
カード・フォルダ作成時に発生する `FirebaseError`（`collection()` の第1引数不正）を解決します。
ユーザーフィードバックに基づき、**「作成機能（createFolder/createCard）」の正常化を最優先**とし、一気な修正ではなく段階的な切り分けと診断ログによる検証を行います。

## 根本原因
1. **命名競合**: `firebase.ts` (Firestore) と `localDB.ts` (Dexie) が共に `db` という名前でエクスポートされており、これが実行時の混乱を招いている。
2. **SnapshotService.ts のバグ**: `firebase.ts` から存在しない `firestore` をインポートしようとしており、`collection(undefined, ...)` が呼び出されている。

## 実装計画

### フェーズ 1: 命名の明確化と診断ログ（基盤整備）
- **[MODIFY] [firebase.ts](file:///C:/FlashcardMaster/src/services/firebase.ts)**: `export const db` -> `export const firestoreDb`.
- **[MODIFY] [localDB.ts](file:///C:/FlashcardMaster/src/services/localDB.ts)**: `export let db` -> `export let localDb`.
- **[MODIFY] [SnapshotService.ts](file:///C:/FlashcardMaster/src/services/SnapshotService.ts)**: インポートを `firestoreDb` に修正。

#### 診断ログの追加
以下のファイルに、問題が発生している箇所の `db` の正体を確認するためのログを追加します。
- `src/hooks/useFolders.ts`: `createFolder` 冒頭
- `src/hooks/useCards.ts`: `createCard` 冒頭
- `src/services/localDB.ts`: `addItem` 冒頭

### フェーズ 2: 段階的な修正と検証（切り分け）
**目的: 全置換の前に、リネームによって `createFolder` のエラーが消えるかを確認する。**

1. `useFolders.ts` および `localDB.ts` の依存関係を `localDb` に修正。
2. 作成ボタンを押し、コンソールでエラーが消えるか（またはログで何が起きているか）を確認。

### フェーズ 3: 全体の置換とクリーンアップ
1. 残りのファイル（`SyncServiceV2.ts`, `CloudSyncAdapter.ts`, `SecurityMonitor.ts` 等）の `db` 参照を `firestoreDb` に置換。
2. 不要なログを削除。

## 検証プラン
1. **ビルド検証**: `npm run build` でインポートエラーがないことを確認。
2. **動作確認**: フォルダ作成が正常に終了し、レコードが保存されることを確認。
3. **診断ログ**: コンソールで `[Diagnostic]` ログが期待通りのインスタンス型を示しているかを確認。
