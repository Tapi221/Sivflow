# Google Calendar 永続認証（Refresh Token フロー）

## 概要

一度 Google Calendar に接続したら、アプリを再起動してもポップアップなしで自動的に再接続できる仕組みを実装しました。

## 仕組み

### 認証フロー

```
初回接続（ユーザーが「接続」ボタンを押す）
  └─ Google OAuth 同意画面
      └─ access_token + refresh_token を取得
          ├─ access_token: localStorage に保存（有効期限 55 分）
          └─ refresh_token: localStorage に永続保存

アプリ再起動時（または access_token 期限切れ時）
  └─ refresh_token が存在する場合
      └─ Electron IPC 経由で Google Token API を呼び出し
          └─ 新しい access_token を取得（ポップアップ不要）
```

### localStorage のキー

| キー                                          | 内容                      | 削除タイミング   |
| --------------------------------------------- | ------------------------- | ---------------- |
| `flashcard-master.gcal.access_token`          | access_token              | 期限切れ・切断時 |
| `flashcard-master.gcal.access_token_expiry`   | access_token 期限         | 期限切れ・切断時 |
| `flashcard-master.gcal.refresh_token`         | **refresh_token（新規）** | 切断時のみ       |
| `flashcard-master.gcal.account_email`         | 接続アカウントのメール    | 切断時           |
| `flashcard-master.gcal.selected_calendar_ids` | 選択カレンダー ID リスト  | 切断時           |
| `flashcard-master.gcal.was_connected`         | 接続履歴フラグ            | 切断時           |

## 変更ファイル一覧

### Electron メインプロセス

- `constants/electron/app/ipc.ts`
  - `oauthRefreshTokens` IPC チャンネルを追加
- `electron/main.ts`
  - `exchangeGoogleOauthTokens` の戻り値に `refreshToken` を追加
  - `refreshGoogleOauthAccessToken` 関数を新規追加
  - `oauthRefreshTokens` IPC ハンドラを登録
- `electron/preload.ts`
  - `oauth.refreshTokens()` メソッドを追加

### 型定義

- `src/application/ports/OAuthBridgePort.ts`
  - `OAuthBridgeTokenExchangeResult.refreshToken` を追加
  - `OAuthBridgePort.refreshTokens()` を追加
- `src/types/desktop-api.ts`
  - `DesktopOauthExchangeResult.refreshToken` を追加
  - `DesktopOauthApi.refreshTokens()` を追加
- `src/types/externals/desktop-api.d.ts`
  - 同上

### プラットフォーム実装

- `src/platform/desktop/index.ts`
  - `oauth.refreshTokens()` を Electron IPC にブリッジ
- `src/platform/web/index.ts`
  - `oauth.refreshTokens()` のスタブを追加（Web 版は非対応）
- `src/platform/capabilities/oauthBridge.ts`
  - `refreshTokens()` デリゲートを追加

### フック

- `src/features/calendar/hooks/useGoogleCalendarIntegration.ts`
  - `LOCAL_REFRESH_TOKEN_KEY` 定数を追加
  - `readLocalRefreshToken` / `writeLocalRefreshToken` ユーティリティを追加
  - `buildDesktopAuthorizeUrl` に `access_type: "offline"` を追加（refresh_token 取得に必須）
  - `requestDesktopCalendarAccessToken` で `refreshToken` を返すよう変更
  - `silentReconnect`: Desktop の場合 refresh_token ベースで動作
  - `connect`: 取得した `refreshToken` を永続化
  - `disconnect`: `refresh_token` もクリア

## 注意事項

- **refresh_token は初回同意時のみ** Google から返却されます。
  - `prompt: "consent"` と `access_type: "offline"` の組み合わせが必要です。
  - すでに接続済みのユーザーは一度「切断」→「再接続」すると refresh_token が取得されます。
- **refresh_token の有効期限**: 通常は無期限ですが、以下の場合に失効します：
  - ユーザーが Google アカウントの「アクセス権限」から手動で削除した場合
  - 6 ヶ月以上アプリを使用しなかった場合
  - refresh_token が 50 個を超えた場合（最も古いものが削除される）
- **Web 版は非対応**: Web 版（Firebase Auth）では refresh_token フローは利用できません。
