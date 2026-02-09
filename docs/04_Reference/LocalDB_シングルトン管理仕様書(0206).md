# LocalDB シングルトン管理仕様書

## 概要
本アプリケーションでは、IndexedDB (Dexie.js) への接続を効率的かつ安全に管理するため、`LocalDB` クラスにおいてシングルトンパターンを採用しています。特に、Webブラウザ環境では同一のデータベース名に対して複数のインスタンスが存在すると、競合やロックの問題が発生しやすいため、厳格なインスタンス管理を行っています。

## シングルトン実装の構造

### 1. インスタンスの取得 (`getInstance`)
`LocalDB.getInstance(userId)` を通じて、現在のユーザーに紐付いたデータベースインスタンスを取得します。

- **静的プロパティ**: `LocalDB.instance` が唯一のキャッシュポイントです。
- **ユーザー識別**: `LocalDB.currentUserId` を保持し、異なるユーザーIDでリクエストされた場合は既存の接続を閉じて新しいインスタンスを作成します。

```typescript
// 利用例
const db = await LocalDB.getInstance(userId);
```

### 2. インスタンスの能動的破棄 (`clearInstance`)
特定のシナリオ（データベースの物理的な削除・再構築、ログアウトなど）において、メモリ上のインスタンスキャッシュをクリアし、接続を完全に閉じる必要があります。

```typescript
// 実装の詳細 (localDB.ts)
static clearInstance() {
  if (LocalDB.instance) {
    if (LocalDB.instance.isOpen()) {
      LocalDB.instance.close();
    }
    LocalDB.instance = null;
    LocalDB.currentUserId = null;
  }
}
```

## 主要なユースケース

### A. データベースの再構築 (Rebuild)
`Dexie.delete()` を使用して物理的な IndexedDB を削除する場合、**削除前に既存のインスタンスを閉じ、削除後にキャッシュをクリアする**ことが極めて重要です。これを怠ると、Dexie は「既に閉じられたインスタンス」を参照し続け、`DatabaseClosedError` が発生します。

**再構築のフロー:**
1. `oldDb.close()`：現在の接続を閉じる。
2. `LocalDB.clearInstance()`：メモリ上のシングルトンを無効化する。
3. `Dexie.delete(dbName)`：物理データベースを削除。
4. `await getLocalDb(userId)`：新しい接続とインスタンスを生成。

### B. ユーザーの切り替え
異なる `userId` でログインした場合、`getInstance` 内で自動的に `clearInstance` 相当の処理が走り、データベースが切り替わります。

## 注意事項
- **直接コンストラクトの禁止**: ブラウザ環境では `new LocalDB()` を直接呼び出すことは禁止されています（フラグによるガードあり）。常に `getInstance()` または `getLocalDb()` を使用してください。
- **循環参照の回避**: 多くのサービスが `LocalDB` に依存するため、インポート時の循環参照を避けるために `getLocalDb` などのエクスポート関数を提供しています。
