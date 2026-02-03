# Sync層における deviceId 利用ルール

本ドキュメントでは、同期システム（Sync Layer）内部における `deviceId` の具体的な利用ルール、制約、および実装指針を定義します。

## 1. 基本原則 (Fundamental Rules)

1.  **必須性 (Mandatory)**: すべての同期リクエストおよび更新操作において、`deviceId` は必須項目である。`deviceId` を持たないクライアントは同期に参加できない。
2.  **不変性 (Immutable)**: 一度生成された `deviceId` は、そのインスタンス（ブラウザ/アプリのインストール単位）が存在する限り変更してはならない。
3.  **クライアント生成 (Client-Generated)**: `deviceId` はサーバーではなく、クライアント側で UUID v4 として生成される。
4.  **単一性 (Singleton)**: 1つのアプリインスタンスにつき、有効な `deviceId` は常に1つだけ保持する。

## 2. ライフサイクル管理

### 2-1. 生成と保存
*   **タイミング**: アプリ初回起動時（または `localStorage` に `deviceId` が存在しない場合）。
*   **保存場所**: `localStorage` (キー: `deviceId`)。
*   **再生成条件**: ユーザーによるブラウザデータ削除、シークレットモードでの再起動、または明示的なログアウト/登録解除時。

### 2-2. 破棄
*   **ログアウト時**: `localStorage` から `deviceId` を削除する。
*   **Revoke検知時**: サーバーから `DEVICE_REVOKED` エラーを受け取った場合、即座にローカルの `deviceId` を破棄し、認証トークンも破棄する。

## 3. 同期プロセスにおける利用

### 3-1. リクエストヘッダー/メタデータ
同期API（またはFirestoreへの書き込み）を行う際、以下の形式で `deviceId` を付与する。

*   **Firestoreドキュメント**: 更新するすべてのドキュメント（Card, Folder, UserSettings）に `lastModifiedDevice: string` フィールドを含める。
*   **目的**:
    *   **競合解決**: 誰が修正したかを追跡するため。
    *   **エコーバック抑制**: 自分が書き込んだ変更通知（Snapshot Listener）を受け取った際、無視するため。

### 3-2. 排他制御 (Sync Lock)
同期処理の重複を防ぐための「分散ロック」のキーとして `deviceId` を使用する。

*   **ロック取得**: `sync_locks/{userId}` ドキュメントに `{ deviceId: myDeviceId, expiresAt: ... }` を書き込む。
*   **ロック検証**: ロック取得済みであっても、`deviceId` が自分のものでなければ「他端末が同期中」と判断して待機する。
*   **強制解除**: ロックの有効期限が切れている場合、`deviceId` が異なっていても強制的に上書き（ロック奪取）を許可する。
    *   **Clock Skew対策**: 期限判定にはクライアント時刻ではなく、必ず **Firestore Server Timestamp** (`request.time` in security rules or `FieldValue.serverTimestamp()` in logic) を基準とする。端末時刻のズレによる誤ったロック解除を防ぐためである。
    *   **監査ログ**: ロック奪取時は、**前回保持していた deviceId を必ずログに記録する**。これは不正利用検知、無限奪取ループの調査、およびユーザー問い合わせ対応のために不可欠である。

### 3-3. セキュリティチェック (Security Guard)
`SyncServiceV2` の開始直後に、必ず自身のステータスを確認する。

*   **チェック対象**: `sync_metadata/{userId}/devices/{myDeviceId}`
*   **判定ロジック**:
    ```typescript
    if (deviceDoc.status === 'revoked') {
      throw new Error('DEVICE_REVOKED');
    }
    ```
*   **頻度**: すべての「能動的な同期アクション（Full Sync, Push, Pull）」の開始時。

## 4. データモデルへの埋め込み

すべての同期対象エンティティ（BaseEntity）は `deviceId` を持つ。

```typescript
interface BaseEntity {
  id: string;
  // ...
  deviceId: string; // 最終更新を行ったデバイスのID
}
```

### 利用シーン: 競合解決 (Conflict Resolution)
データ競合が発生した場合（Last Writer Wins 戦略）、`updatedAt` で勝敗を決するが、補足情報として `deviceId` を使用する。

*   **自己競合の回避**: ローカルの `deviceId` とリモートの `deviceId` が一致する場合、それは「自分の過去の書き込みが遅れて届いた」だけである可能性があるため、競合として扱わずサイレントに処理する（あるいは無視する）。

## 5. エラーハンドリング

| シナリオ | 挙動 |
| :--- | :--- |
| **LocalStorageにない** | 新規生成し、新規デバイスとして登録フローを開始。 |
| **Firestoreに登録がない** | 最初の同期時に自動的に `devices` コレクションにレコードを作成する（Upsert）。 |
| **Revokedされている** | 同期処理を中断、エラーをスロー、ユーザーをログアウトさせ、ローカルデータをクリア推奨。 |
| **形式不正 (Not UUID)** | 無効なIDとして破棄し、再生成する。 |

## 6. 禁止事項

1.  **`deviceId` の共有**: 複数のブラウザ/端末で同一の `deviceId` を使い回してはならない（バックアップからの安易な復元などで起こりうる）。これによりデータの不整合やロックの競合が発生する。
2.  **UIへの露出**: デバッグ目的以外で、生等の `deviceId` (UUID) をユーザーに見せてはならない。必ず `deviceName` を使用する。
3.  **クエリパラメータでの送信**: セキュリティログに残る可能性があるため、URLパラメータには含めない（Firestore SDK経由やBody経由とする）。
4.  **ローカル書き換え禁止**: 開発者ツール等で `deviceId` を手動書き換えしての動作検証を本番相当環境で行ってはならない（検証には専用の検証用フラグや環境変数を用いること）。これはデータ不整合の温床となる。
