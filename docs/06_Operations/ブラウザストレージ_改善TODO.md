# ブラウザストレージ準拠 - 改善TODO一覧

## 目的

レビューで指摘された「運用・検証視点の甘さ」を補完するための TODO リスト。

---

## 🔴 優先度: 高（即実装推奨）

### 1. Snapshot の version 管理

**現状**: Snapshot に version フィールドがない

**問題**:
- Snapshot が論理的に壊れていても検知できない
- ロールバックができない

**実装内容**:
```ts
interface SnapshotMetadata {
  schemaVersion: number;
  generationCounter: number;
  version: string; // 🔥 追加: アプリバージョン
  createdAt: string;
  appVersion: string;
  userId: string;
}
```

**完了条件**:
- Snapshot 保存時に version を記録
- Snapshot 復元時に version を確認
- version 不一致時に警告

---

### 2. restore 前の local backup

**現状**: Snapshot 復元時に local backup を作成しない

**問題**:
- 復元に失敗してもロールバックできない
- 誤って古い Snapshot で上書きしても戻せない

**実装内容**:
```ts
async restoreSnapshot(snapshot: AppSnapshot) {
  // 🔥 復元前に local backup を作成
  const backup = await this.createSnapshot(userId);
  await this.saveToFirestore(backup, { isBackup: true });
  
  // 復元実行
  await this.applySnapshot(snapshot);
}
```

**完了条件**:
- 復元前に自動 backup
- backup は別コレクションに保存
- 最低一世代の巻き戻し可能

---

### 3. READ_ONLY からの自動復帰

**現状**: READ_ONLY モードに入ったら手動リロードが必要

**問題**:
- ユーザーが気づかない
- 容量が回復しても自動復帰しない

**実装内容**:
```ts
// 定期的に容量をチェック
setInterval(async () => {
  if (StorageStateManager.isReadOnly(userId)) {
    const estimate = await navigator.storage.estimate();
    const usagePercent = (estimate.usage! / estimate.quota!) * 100;
    
    if (usagePercent < 80) {
      // 容量が回復したら NORMAL に戻す
      StorageStateManager.reset(userId);
      console.log('[Storage] Recovered from READ_ONLY mode');
    }
  }
}, 60000); // 1分ごと
```

**完了条件**:
- 容量が回復したら自動復帰
- ログに復帰を記録
- ユーザーに通知

---

### 4. ログアウト時の状態リセット

**現状**: ログアウト時に StorageStateManager の状態が残る

**問題**:
- 次のユーザーに状態が引き継がれる
- READ_ONLY 状態が残る

**実装内容**:
```ts
// AuthContext のログアウト処理
if (user === null) {
  // 🔥 状態をリセット
  if (previousUserId) {
    StorageStateManager.reset(previousUserId);
  }
  // ... 既存の処理
}
```

**完了条件**:
- ログアウト時に状態をクリア
- 次のログイン時に NORMAL 状態

---

## 🟡 優先度: 中（次のスプリント）

### 5. 圧縮のメトリクス記録

**現状**: 圧縮の実行状況が可視化されていない

**問題**:
- 圧縮が動いているか分からない
- バグに気づかない

**実装内容**:
```ts
async compress(userId: string): Promise<void> {
  const startTime = Date.now();
  const beforeCount = await db.levelHistories.count();
  
  // 圧縮実行
  const compressed = this.compressByDay(oldEvents, userId);
  
  const afterCount = await db.levelHistories.count();
  const duration = Date.now() - startTime;
  
  // 🔥 メトリクスを記録
  console.log(`[Compression] Before: ${beforeCount}, After: ${afterCount}, Duration: ${duration}ms`);
  
  // TODO: Firestore にメトリクスを保存
}
```

**完了条件**:
- 圧縮前後の件数をログ
- 実行時間をログ
- 容量削減量をログ

---

### 6. Firestore エラー時のリトライ戦略

**現状**: Firestore エラー時にリトライしない

**問題**:
- 一時的なエラーで失敗する
- ユーザーが手動でリトライする必要がある

**実装内容**:
```ts
async saveToFirestoreWithRetry(snapshot: AppSnapshot, maxRetries = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.saveToFirestore(snapshot);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 指数バックオフ
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**完了条件**:
- 指数バックオフでリトライ
- 最大リトライ回数を設定
- リトライ回数をログ

---

### 7. 移行失敗時のリトライ戦略

**現状**: Snapshot 移行失敗時にリトライしない

**問題**:
- 初回ログイン時の移行が失敗すると、次回も失敗する
- LocalStorage の Snapshot が残り続ける

**実装内容**:
```ts
// metadata に移行フラグを追加
interface IndexedDBMetadata {
  // ... 既存フィールド
  snapshotMigrated: boolean; // 🔥 追加
}

// 起動時に移行状態を確認
if (!meta.snapshotMigrated) {
  await snapshotService.migrateFromLocalStorage(userId);
  meta.snapshotMigrated = true;
  await metaService.update(meta);
}
```

**完了条件**:
- 移行状態を metadata に保存
- 未移行の場合は次回リトライ
- 移行完了後はスキップ

---

## 🟢 優先度: 低（運用フェーズ）

### 8. 運用ダッシュボード

**現状**: メトリクスが可視化されていない

**問題**:
- 運用状況が分からない
- 問題に気づかない

**実装内容**:
- Firestore にメトリクスを保存
- 管理画面でメトリクスを表示
- アラート機能

**完了条件**:
- ダッシュボードの作成
- メトリクスの可視化
- アラート設定

---

### 9. 自動テスト

**現状**: 失敗ケースの自動テストがない

**問題**:
- 手動テストが必要
- リグレッションに気づかない

**実装内容**:
- metadata 削除テスト
- DIRTY 状態テスト
- QuotaExceededError テスト
- 無限ループテスト

**完了条件**:
- E2E テストの作成
- CI/CD に統合

---

## まとめ

このTODOリストは「戦場で血を見た後の設計」に近づくためのものです。

**次のステップ**:
1. 優先度: 高 の TODO を実装
2. 運用チェックリストを更新
3. 失敗ケース一覧を更新
