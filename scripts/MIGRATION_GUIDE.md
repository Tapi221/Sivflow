# Firestore データ移行ガイド

旧トップレベルコレクション (`/folders`, `/cards`) から新しいサブコレクション構造 (`/users/{userId}/folders`, `/users/{userId}/cards`) へのデータ移行手順。

---

## 📋 前提条件

### 1. サービスアカウントキーの取得

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. ⚙️ **プロジェクトの設定** → **サービスアカウント** タブ
4. **新しい秘密鍵の生成** をクリック
5. ダウンロードしたJSONファイルを `serviceAccountKey.json` にリネーム
6. プロジェクトルート (`FlashcardMaster/`) に配置

```plaintext
FlashcardMaster/
├── serviceAccountKey.json  ← ここに配置
├── scripts/
│   └── migrateFirestoreToSubcollections.ts
├── package.json
└── ...
```

⚠️ **重要**: `serviceAccountKey.json` は絶対にGitにコミットしないでください。  
`.gitignore` に既に追加されているか確認してください。

### 2. 必要なパッケージのインストール

```powershell
# firebase-admin と tsx (TypeScript実行環境) をインストール
npm install --save-dev firebase-admin tsx
```

---

## 🚀 実行手順

### ステップ1: Dry-Run で事前確認（推奨）

実際の書き込みを行わず、移行対象とスキップされるドキュメントを確認します。

```powershell
# 基本的な確認
npx tsx scripts/migrateFirestoreToSubcollections.ts --dry-run

# 詳細ログ付き（スキップ理由や差分も表示）
npx tsx scripts/migrateFirestoreToSubcollections.ts --dry-run --verbose
```

**確認項目**:
- ✅ 合計件数が想定通りか
- ✅ userId が存在しないドキュメントがないか
- ✅ 既にサブコレクションに存在するドキュメント数

### ステップ2: Firestoreのバックアップ（必須）

万が一のため、移行前にFirestoreをエクスポートします。

#### Firebase Console からエクスポート:
1. Firebase Console → **Firestore Database**
2. 画面右上の **︙** → **データをエクスポート**
3. エクスポート先（Cloud Storage バケット）を指定
4. コレクション: `folders`, `cards` を選択
5. **エクスポート** をクリック

#### または gcloud CLI を使用:
```powershell
gcloud firestore export gs://[YOUR-BUCKET-NAME]/firestore-backup-$(Get-Date -Format "yyyyMMdd-HHmmss")
```

### ステップ3: 本番実行

**⚠️ 警告**: この操作は元に戻せません。必ずバックアップを取得してください。

```powershell
# 本番実行（10秒後に開始）
npx tsx scripts/migrateFirestoreToSubcollections.ts

# 詳細ログ付きで実行
npx tsx scripts/migrateFirestoreToSubcollections.ts --verbose
```

実行中は以下のような出力が表示されます:

```plaintext
============================================================
🚀 Firestore データ移行スクリプト
============================================================

モード: ✍️  本番実行
詳細ログ: 無効

⚠️  警告: 本番モードで実行します。Firestoreに書き込みが行われます。
   10秒後に開始します。中止する場合は Ctrl+C を押してください。

✅ Firebase Admin SDK 初期化完了

📁 フォルダの移行を開始...
   対象: 15 件

✅ [FOLDER] abc123 → users/user-uid-1/folders/abc123
✅ [FOLDER] def456 → users/user-uid-1/folders/def456
⏭️  [FOLDER] ghi789 (スキップ: 既に存在)
...
```

### ステップ4: 移行結果の確認

#### 統計情報の確認

実行完了後、以下のような統計が表示されます:

```plaintext
============================================================
📊 移行統計
============================================================

📁 フォルダ:
   合計:         20 件
   移行完了:     18 件
   スキップ:     2 件 (既に新パスに存在)
   userId なし:  0 件
   エラー:       0 件

🃏 カード:
   合計:         150 件
   移行完了:     150 件
   スキップ:     0 件 (既に新パスに存在)
   userId なし:  0 件
   エラー:       0 件

============================================================

✅ 移行が完了しました。
```

#### Firestore Console で確認

1. Firebase Console → **Firestore Database**
2. 以下のパスにデータが存在するか確認:
   ```
   /users/{userId}/folders/{folderId}
   /users/{userId}/cards/{cardId}
   ```
3. 各ドキュメントに `migratedAt` フィールドが追加されているか確認

#### アプリで動作確認

1. ローカルで `npm run dev` を実行
2. ログイン後、以下を確認:
   - ✅ フォルダ一覧が表示される
   - ✅ カード一覧が表示される
   - ✅ 新規フォルダ/カードが作成できる
   - ✅ ゴミ箱からの復元が動作する

---

## 🛠️ トラブルシューティング

### エラー: "サービスアカウントキーが見つかりません"

**原因**: `serviceAccountKey.json` が正しい場所にない

**解決策**:
```powershell
# ファイルの存在確認
Test-Path .\serviceAccountKey.json

# 出力が False の場合、Firebase Console から再ダウンロードして配置
```

### エラー: "PERMISSION_DENIED"

**原因**: サービスアカウントにFirestoreの書き込み権限がない

**解決策**:
1. Firebase Console → **プロジェクトの設定** → **サービスアカウント**
2. 使用中のサービスアカウントを確認
3. IAMロールで `Cloud Datastore User` または `Editor` が付与されているか確認

### 警告: "userId が存在しないドキュメント"

**原因**: データ整合性の問題（古いデータなど）

**解決策**:
```powershell
# 該当ドキュメントを手動で確認
# Firebase Console で該当IDのドキュメントを開き、userIdフィールドを確認

# 必要に応じて手動でuserIdを追加するか、削除
```

### 移行後もデータが表示されない

**チェック項目**:

1. **Firestore Rules が更新されているか確認**:
   ```plaintext
   match /users/{userId} {
     match /folders/{id} { allow read, write: if isAuthenticated() && isOwner(userId); }
     match /cards/{id} { allow read, write: if isAuthenticated() && isOwner(userId); }
   }
   ```

2. **アプリコードが新パスを使用しているか確認**:
   - [cloudProvider.ts](../src/services/cloudProvider.ts)
   - [Trash.jsx](../src/Pages/Trash.jsx)
   - [ImageDiagnostics.jsx](../src/Pages/ImageDiagnostics.jsx)

3. **ブラウザのキャッシュクリア**:
   ```
   F12 → Application → Clear storage → Clear site data
   ```

---

## 📝 移行後の作業

### 1. 旧トップレベルコレクションの削除（オプション）

移行が成功し、アプリで動作確認できたら、旧コレクションを削除できます。

⚠️ **注意**: 削除前に必ずバックアップがあることを確認してください。

```powershell
# 削除スクリプト（別途作成が必要）
# npx tsx scripts/deleteOldCollections.ts --dry-run
```

または Firebase Console から手動削除:
1. **Firestore Database** → `folders` コレクション
2. 右クリック → **コレクションを削除**
3. 同様に `cards` コレクションも削除

### 2. Firestore Rules の更新

旧トップレベルルールを削除:

[firestore.rules](../firestore.rules) の **行44-62** を削除:

```diff
- // フォルダ
- match /folders/{folderId} {
-   allow read: if isAuthenticated() && 
-     (resource == null || resource.data.userId == request.auth.uid);
-   allow create: if isAuthenticated() && 
-     request.resource.data.userId == request.auth.uid;
-   allow update, delete: if isAuthenticated() && 
-     resource.data.userId == request.auth.uid;
- }
- 
- // カード
- match /cards/{cardId} {
-   allow read: if isAuthenticated() && 
-     (resource == null || resource.data.userId == request.auth.uid);
-   allow create: if isAuthenticated() && 
-     request.resource.data.userId == request.auth.uid;
-   allow update, delete: if isAuthenticated() && 
-     resource.data.userId == request.auth.uid;
- }
```

更新後、デプロイ:
```powershell
firebase deploy --only firestore:rules
```

### 3. 本番デプロイ

```powershell
# ビルド確認
npm run build

# 本番デプロイ
firebase deploy
```

---

## 📊 想定される実行時間

| データ量 | 実行時間（目安） |
|---------|----------------|
| 100件 | 5-10秒 |
| 1,000件 | 30秒-1分 |
| 10,000件 | 5-10分 |
| 100,000件 | 30-60分 |

実行時間はネットワーク速度とFirestoreのレート制限に依存します。

---

## 🆘 サポート

問題が発生した場合:

1. Dry-Run で詳細ログを確認: `--dry-run --verbose`
2. Firebase Console でデータ構造を確認
3. エラーメッセージとスタックトレースを保存
4. 必要に応じてバックアップからリストア

---

## 📌 重要な注意事項

- ✅ 必ずバックアップを取得してから実行
- ✅ Dry-Run で事前確認を実施
- ✅ 本番環境への影響を最小化するため、アクセスの少ない時間帯に実行
- ⚠️ `serviceAccountKey.json` は絶対に公開しない
- ⚠️ 移行中はアプリへのアクセスを制限することを推奨（メンテナンスモード）

---

**移行完了後、このガイドは削除せず保管してください。**  
将来的に他のコレクションを移行する際の参考になります。
