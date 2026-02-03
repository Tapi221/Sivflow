# Firestore 初期化エラー修正計画

## 概要
フォルダやカードの作成時に Firestore の `collection()` 関数で `FirebaseError` が発生し、データの保存が失敗する問題を修正します。

## 原因分析
1. **変数名の不整合 (主要因)**:
   - `StorageManager.tsx` および `storageCleanup.ts` において、`firestoreDb` をインポートしているにもかかわらず、`collection(db, ...)` のように `db` という未定義（または意図しない型）の変数を使用していた。
   - これにより、`collection()` の第1引数が `FirebaseFirestore` ではなく `undefined` となり、報告されたエラーが発生した。
2. **同期トリガーによるブロッキング**:
   - `localDb.addItem` の直後に実行される同期トリガーが同期的に Firestore 操作を行っていたため、そこで発生したエラーが `addItem` 全体を失敗（またはロールバック）させ、結果として Dexie (LocalDB) にもデータが残らない状態になっていた。

## 修正内容

### 1. 参照ミスおよび記法の修正

#### [MODIFY] [StorageManager.tsx](file:///C:/FlashcardMaster/src/Components/settings/StorageManager.tsx)
- `db` を `firestoreDb` に変更。

#### [MODIFY] [storageCleanup.ts](file:///C:/FlashcardMaster/src/utils/storageCleanup.ts)
- `db` を `firestoreDb` に変更。

#### [MODIFY] [SnapshotService.ts](file:///C:/FlashcardMaster/src/services/SnapshotService.ts)
- `collection(firestoreDb, 'users', userId, 'snapshots')` を `collection(firestoreDb, \`users/${userId}/snapshots\`)` に変更（Modular SDK の推奨記法へ統一）。

### 2. 同期基盤の強化 (実施済み内容の再確認)
- [x] `localDB.ts` の `enqueueSync` 内で同期トリガーを `setTimeout(0)` でラップし、クラウド側のエラーがローカル保存（Dexie）を妨げないようにした。

## 設計方針への回答
> **Q: Firestore 失敗時でも LocalDB + SyncQueue までは進むべきか？**

**A: はい、その通りです。**
本アプリの設計原則は **Offline First / Local First** です。クラウド側の初期化失敗やネットワークエラーが、ユーザーの「今この瞬間の保存操作」を止めてはなりません。
今回の対応により、同期トリガーを非同期化（macrotask への分離）したことで、Firestore 側でどのような例外が発生しても、LocalDB への書き込みと SyncQueue への登録までは必ず完了するようになります。

## 検証プラン
1. **フォルダ作成テスト**:
   - フォルダ作成を行い、UIに即座に反映されること、および Dexie にデータが存在することを確認。
2. **ログ確認**:
   - `[Diagnostic]` ログにより、`addItem` SUCCESS の後に `syncTrigger` が非同期で呼ばれることを確認。
3. **StorageManager 確認**:
   - 設定画面の「データ」タブを開き、アップロード済みファイル一覧が正常に表示される（エラーで落ちない）ことを確認。
