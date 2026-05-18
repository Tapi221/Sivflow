# Google Calendar リアルタイム同期 — 実装計画

## 概要

Google Calendar の「削除・変更・追加」をリアルタイムに近い形でアプリに反映するバックエンド（フロントエンドサービス層）を実装する。

---

## 同期戦略の選定

### Google Calendar API の制約

| 手法 | 説明 | 備考 |
|------|------|------|
| **Push Notifications (Webhook)** | Google がサーバーへ HTTPS で通知 | **外部公開 HTTPS エンドポイント必須**。Electron デスクトップアプリには不向き |
| **Incremental Sync (syncToken)** | 変更分だけ取得できる `syncToken` | ✅ クライアントのみで完結。削除イベントも `status: "cancelled"` で検知可能 |
| **フルポーリング** | 一定間隔で全件取得 | API クォータを大量消費、削除の検知が難しい |

### 採用する方式：**Incremental Sync + ポーリング**

```
初回（または syncToken 失効時）
  └─ events.list({ singleEvents: true, timeMin, timeMax })
      └─ nextSyncToken を保存（localStorage: flashcard-master.gcal.sync_tokens）

ポーリング（60 秒間隔）
  └─ events.list({ syncToken: nextSyncToken })
      ├─ status: "cancelled" → イベント削除（onEventDeleted コールバック）
      ├─ 既存 id が存在 → イベント更新（onEventUpdated コールバック）
      └─ 新規 id → イベント追加（onEventAdded コールバック）
      └─ 新しい nextSyncToken を上書き保存

410 Gone エラー → syncToken 無効 → フル再取得にフォールバック
```

---

## 実装済みファイル

### 新規作成

| ファイル | 役割 |
|----------|------|
| `src/features/calendar/googlecalendar-integration/gcalSync.types.ts` | 同期エンジン専用型定義 |
| `src/features/calendar/googlecalendar-integration/GoogleCalendarSyncEngine.ts` | syncToken 管理・差分適用・ポーリングループの本体 |

### 変更

| ファイル | 変更内容 |
|----------|----------|
| `src/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration.ts` | `GoogleCalendarSyncEngine` を組み込み、ポーリング開始/停止を管理。`syncState` / `lastSyncedAt` / `forceSync` を公開 API に追加 |

---

## GoogleCalendarSyncEngine の設計

### 公開 API

```typescript
class GoogleCalendarSyncEngine {
  start(context: GCalSyncStartContext): void      // エンジン起動
  stop(): void                                    // エンジン停止
  forceSync(): Promise<void>                      // 手動強制同期
  resetSyncTokensForCalendars(ids: string[]): void // 特定カレンダーのトークンリセット
  clearAllSyncTokens(): void                      // 全トークンクリア（切断時）
}
```

### エラーハンドリング

| エラー | 対処 |
|--------|------|
| `401 Unauthorized` | `silentReconnect()` → リトライ 1 回 |
| `410 Gone` | syncToken クリア → フル同期 |
| `403 Rate Limit` | 指数バックオフ（60s → 120s → 240s → 最大 600s） |
| ネットワーク切断 | バックオフ後リトライ |
| その他エラー | バックオフ後リトライ |

---

## ポーリング動作

| 状況 | 動作 |
|------|------|
| 通常時 | 60 秒間隔でポーリング |
| エラー後 | 指数バックオフ（最大 10 分） |
| フォーカス復帰時 | `visibilitychange` イベントで即時同期 |
| バックグラウンド時 | ポーリング停止（API クォータ節約） |
| 切断時 | エンジン停止・syncToken 全クリア |

---

## localStorage キー

| キー | 内容 |
|------|------|
| `flashcard-master.gcal.sync_tokens` | `Record<calendarId, syncToken>` を JSON 化。アプリ再起動時に復元して初回フル同期をスキップ |

（既存キーは変更なし）

---

## `useGoogleCalendarIntegration` の新規公開 API

```typescript
// 追加されたフックの返り値
{
  syncState: 'idle' | 'syncing' | 'error', // 現在の同期状態
  lastSyncedAt: Date | null,               // 最終正常同期日時
  forceSync: () => Promise<void>,          // 手動強制同期
}
```

---

## 注意事項

- **`syncToken` 使用時は `timeMin`/`timeMax`/`q` などのフィルタパラメータ使用不可**（Google Calendar API 制約）
- **繰り返しイベント**: `singleEvents: true` を初回フル同期に指定することで展開済みで取得する
- **Web 版（Firebase Auth）でも同じエンジンが動作する**（accessToken さえあれば API 呼び出しは同一）
- **既存の `loadEvents`（ビュースクロール時の範囲読み込み）と同期エンジンは共存**: どちらも `setEvents` を呼び出すが、Map による id 重複排除で整合性を保つ
