# 設定画面のモバイル表示最適化

- [ ] 現状の仕様確認 <!-- id: 0 -->
    - [x] `Components/settings/SettingsDialog.jsx` の確認 <!-- id: 1 -->
    - [x] ルーティングと呼び出し元の確認 (`App.tsx`, `Layout.tsx`) <!-- id: 2 -->
- [x] 実装計画の作成 (Implementation Plan) <!-- id: 3 -->
- [x] モバイル最適化の実装 <!-- id: 4 -->
    - [x] レスポンシブレイアウトの適用 <!-- id: 5 -->
    - [x] 余白・フォントサイズの調整 <!-- id: 6 -->
- [x] 動作確認 <!-- id: 7 -->
- [x] 本番環境への反映 (Deploy) <!-- id: 8 -->

# 統計画面のフォルダ選択アイコン重複修正
- [x] 実装計画の作成 (Implementation Plan) <!-- id: 9 -->
- [x] アイコン修正の実装 <!-- id: 10 -->
- [x] 動作確認 <!-- id: 11 -->

# 新規フォルダ作成画面のモバイル表示最適化
- [ ] 現状の仕様確認 <!-- id: 12 -->
    - [x] `Components/folder/FolderDialog.tsx` の確認 <!-- id: 13 -->
- [x] 実装計画の作成 (Implementation Plan) <!-- id: 14 -->
- [x] モバイル最適化の実装 <!-- id: 15 -->
- [x] 動作確認 <!-- id: 16 -->

# Phase 2: 本番スケール対応実装
- [x] 実装計画の作成（Rev.3・最終版） <!-- id: 400 -->
- [x] Task 0: 監視設計・基盤 <!-- id: 401 -->
    - [x] ログ・メトリクス型定義 (`telemetry.ts`) <!-- id: 402 -->
    - [x] インターフェース定義 (`ISyncService.ts`) <!-- id: 403 -->
    - [x] TelemetryService実装 <!-- id: 404 -->
- [x] Task 1: 構造改革 (SyncService分割) <!-- id: 405 -->
    - [x] DiffEngine実装（純粋関数） <!-- id: 406 -->
    - [x] QueueManager実装（LocalDB依存分離） <!-- id: 407 -->
    - [x] CloudSyncAdapter実装（Firestore I/O分離） <!-- id: 408 -->
- [x] Task 2: 機能強化 <!-- id: 409 -->
    - [x] NetworkMonitor実装（状態遷移・ヒステリシス） <!-- id: 410 -->
    - [x] Context-aware Batch Constraint <!-- id: 411 -->
- [x] Task 3: オーケストレーション <!-- id: 412 -->
    - [x] SyncServiceV2実装 <!-- id: 413 -->
- [x] Task 4: 運用ドキュメント <!-- id: 414 -->
    - [x] Phase2運用ガイド.md <!-- id: 415 -->
    - [x] Phase2実装完了レポート.md <!-- id: 416 -->
- [x] Task 5: テスト・統合 <!-- id: 417 -->
    - [x] ユニットテスト作成（DiffEngine） <!-- id: 418 -->
    - [x] Feature Flag実装 (`features/flags.ts`) <!-- id: 420 -->
    - [x] 統合ファクトリ実装 (`SyncServiceFactory.ts`) <!-- id: 422 -->
    - [x] 既存SyncServiceとの統合（SyncServiceV2 への完全移行） <!-- id: 419 -->
    - [x] 段階的ロールアウト（100% 適用開始） <!-- id: 421 -->

# UI改善およびアクセントカラー統一
- [x] アクセントカラーの動的化（全画面監査・置換） <!-- id: 500 -->
- [x] モバイルダッシュボードのレイアウト調整（ストリーク表示位置） <!-- id: 501 -->
- [x] 統計グラフのテーマカラー対応 <!-- id: 502 -->
- [x] ドキュメントの日本語化整備 <!-- id: 503 -->
- [x] UIの追加調整（トグル、ツールチップ、ソートアイコン） <!-- id: 504 -->
- [x] 実装計画のアーカイブ整理とマスター仕様書への反映（v2.1） <!-- id: 505 -->

# 不具合修正：カード保存不可問題の解決
- [x] 原因調査（nanoid インポート漏れ、データの部分的更新による破損、厳格なバリデーション）
- [x] 修正実装（LocalDB / SyncServiceV2）
- [x] 文書化（調査報告書・仕様書の更新）
# 不具合修正：カード表示内容消失問題の解決
- [x] 原因調査（ブロックエディタ導入に伴う legacy フィールドの同期漏れ） <!-- id: 600 -->
- [ ] 実装計画の作成 (docs/06_Operations/カード表示内容消失修正計画.md) <!-- id: 601 -->
- [ ] 修正実装（normalizeCard, denormalizeCardForStorage） <!-- id: 602 -->
- [ ] 動作確認とデータ復旧の確認 <!-- id: 603 -->
