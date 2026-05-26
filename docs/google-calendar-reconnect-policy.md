# Google Calendar 再連携ポリシー

## 結論

Google Calendar 連携は、一度連携したあとに通常利用で毎回ユーザー再連携を求めない設計になっている。

ただし、「一度連携したら二度とユーザー自身で再連携する必要がない」と保証する設計ではない。保存済み refresh token が使えない状態になった場合や、必要な Google Calendar 権限が不足している場合は、ユーザーによる再連携が必要になる。

## 通常時の設計

初回連携時は Google Calendar の読み取り権限と Google Tasks 権限を同時に要求し、offline access によって refresh token を取得する。

Web で `VITE_GOOGLE_OAUTH_SERVER_TOKENS=true` の場合、refresh token はクライアントの localStorage ではなく Cloud Functions / Firestore 側に暗号化保存される。以後はサーバー保存済み refresh token から access token を再発行し、Google Calendar API の呼び出しを継続する。

Desktop では refresh token を localStorage に残さず、`oauthBridge.storeRefreshToken` / `oauthBridge.readRefreshToken` を使って secure storage 側へ移す設計になっている。

## Google Calendar 側の自動復旧経路

`src/integration/googlecalendar-integration/useMultiAccountGoogleCalendar.ts` では、保存済みアカウントを読み込み、access token が有効であればそのまま利用する。

access token が無い、または期限切れの場合は、次の順で復旧を試みる。

1. サーバー保存 token が有効な Web 実行時は、`getServerStoredGoogleCalendarAccessToken` で Cloud Functions から access token を取得する。
2. Desktop では secure storage から refresh token を読み、`refreshCalendarAccessToken` で access token を再発行する。
3. それ以外では、保存済み refresh token があれば `refreshCalendarAccessToken` で access token を再発行する。
4. refresh token が無い場合は、silent token request を試みる。

同期エンジン側でも `silentReconnect` が定義されており、同期中に token が失効した場合は `getRecoverableAccessToken` を通じて自動復旧を試みる。

## ユーザー再連携が必要になるケース

### 1. Google 側で refresh token が無効化された場合

`functions/src/gcal/tokenErrors.ts` では、Google token endpoint が `invalid_grant` を返した場合に `reconnectRequired: true` と分類している。

想定される原因は次のようなもの。

- ユーザーが Google アカウント側でアプリ連携を解除した
- Google 側で refresh token が期限切れ、または無効化された
- 認可コードの再利用などにより token exchange が拒否された

この場合、保存済み refresh token から Google Calendar 用の access token を再発行できないため、ユーザーによる再連携が必要になる。

### 2. 保存済み refresh token が無い場合

`functions/src/index.ts` の `getGoogleCalendarAccessToken` では、Firestore 上のアカウントデータに `encryptedRefreshToken` が存在しない場合、`stored_refresh_token_missing` として `reconnectRequired: true` を返す。

また、初回連携または明示再連携時に Google が refresh token を返さず、既存の保存済み refresh token も無い場合も、同じく再連携が必要になる。

この状態ではサーバー側で Google Calendar の access token を自動再発行できない。

### 3. Google Calendar 権限が不足している場合

`functions/src/index.ts` では、必須スコープとして次の権限を定義している。

- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/tasks`

Google Calendar の同期には `calendar.readonly` が必要である。実装上は Google Tasks 連携も同じ OAuth フローに含めているため、どちらかの権限が欠けている場合は `insufficient_google_scope` として `reconnectRequired: true` を返す。

そのため、Calendar だけ使う場合でも、現在の実装では Calendar と Tasks の両方の権限を許可した状態で再連携する必要がある。

### 4. Desktop の secure storage 側の refresh token が失われた場合

Desktop では refresh token を localStorage に保存し続けず、secure storage 側へ移す。

`src/integration/googlecalendar-integration/useMultiAccountGoogleCalendar.ts` では、Desktop 実行時に `oauthBridge.storeRefreshToken` / `oauthBridge.readRefreshToken` を使って refresh token を保存・読み込みする。

そのため、OS 側の資格情報ストア、アプリデータ、または secure storage 上の保存済み refresh token が失われた場合、自動復旧に必要な refresh token を読めなくなる。この場合は再連携が必要になる。

### 5. サーバー側の token 復号に失敗した場合

サーバー保存 token を使う Web 実行時は、Firestore に保存された encrypted refresh token を Cloud Functions 側で復号する。

暗号化キーの不一致、保存データ破損、`GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` の設定不備などにより復号できない場合、ユーザーの再連携だけでは解決できない。管理者が Functions secrets と Firestore の保存状態を確認する必要がある。

## 実装上の見方

Google Calendar の同期・カレンダー一覧取得では、access token が無い場合や API が認証エラーを返した場合に、自動で access token の復旧を試みる。

正常な refresh token が保存されている限り、Google Calendar はユーザー操作なしで復旧する。

一方で、復旧に必要な refresh token 自体が無効、欠落、復号不能、または必要スコープ不足の場合は、自動復旧ではなく再連携または管理者対応が必要になる。

## まとめ

この実装は「一度連携すれば通常はユーザー操作なしで access token を更新して Google Calendar 同期を続ける」設計である。

ただし、「二度と再連携不要」と保証する設計ではない。Google 側の token 無効化、保存済み refresh token の欠落、権限不足、Desktop secure storage の消失、サーバー保存 token の復号失敗などでは、ユーザー自身の再連携または管理者対応が必要になる。
