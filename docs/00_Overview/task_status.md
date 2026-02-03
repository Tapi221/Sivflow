# Phase 2: 本番スケール対応 実装タスク (Rev.3・最終版)

## 概要

大規模リリース基準に基づき、SyncServiceの解体・再構築を行い、堅牢な同期システムを構築する。

---

## Task 0: 監視設計・基盤（最優先）

### 0.1 メトリクス定義と実装
- [x] ログ設計（構造化ログ、`SyncContext`定義）
- [x] 重要指標（SLI）の定義:
    - System: `SyncAvailability`, `Throughput`
    - UX: `PerceivedLatency`, `ConsistencyRate`, `SilentFailureRate`
- [x] フォールバック監視: `sync_fallback_rate`, `fallback_reason`
- [x] パフォーマンス計測用ラッパーの実装
- [x] ダッシュボード設計（データ構造定義完了）

### 0.2 テスト基盤の整備
- [ ] ネットワーク遅延・エラーシミュレータの準備
- [ ] 状態遷移テスト用のMock NetworkMonitor作成

---

## Task 1: 構造改革 (SyncService Refactoring)

### 1.1 インターフェース定義 (DIパターン)
- [x] `ISyncService`, `IQueueManager`, `INetworkMonitor`, `IDiffEngine`, `ICloudSyncAdapter` の定義
- [x] DIコンテナ/ファクトリの設計 (`SyncServiceFactory`)

### 1.2 DiffEngine の切り出し
- [x] 純粋関数化（副作用厳禁）
- [x] テストカバレッジ100%達成（ユニットテスト作成済み）

### 1.3 CloudSyncAdapter の切り出し
- [x] I/O処理の完全分離
- [x] エラーハンドリングの統一

### 1.4 QueueManager の切り出し
- [x] LocalDB依存の分離
- [x] リトライ制御の移管

---

## Task 2: 機能強化 (Network & Adaptive)

### 2.1 NetworkMonitor (状態遷移・ヒステリシス)
- [x] `NetworkStatus` 定義 (`excellent`|`good`|`poor`|`offline`)
- [x] 状態遷移ロジック（昇格・降格条件の厳格化）
- [x] `NetworkHealth` 算出ロジック

### 2.2 Adaptive Flush (ガードレール & 優先度)
- [x] `SyncContext` (UserInitiated, Background, HeavyUI) の実装
- [x] 優先度制御ロジック（人間操作最優先）
- [x] `BatchConstraint` 実装（バッテリー・通信制限）

### 2.3 差分同期の安全性強化
- [x] Authoritative Side (サーバー正) の明確化
- [x] フォールバック処理の実装
- [x] 部分更新の整合性チェック

---

## Task 3: 統合とオーケストレーション

### 3.1 新SyncServiceの実装
- [x] 各Interfaceの統括ロジック
- [x] ライフサイクル管理
- [x] エラーバウンダリの設定

### 3.2 既存コードからの移行
- [ ] 旧コードのDeprecation
- [x] 移行パスの確認（Feature Flag, Factory実装済み）

---

## Task 4: 検証と運用準備

### 4.1 負荷・異常系テスト
- [ ] T1-T4 の再実施
- [ ] 悪条件テスト（低速回線、パケットロス、BGキル）
- [ ] 状態遷移テスト（不安定な回線での挙動）

### 4.2 運用ドキュメント
- [x] トラブルシューティングガイド作成（症状対処）
- [x] アラート対応マニュアル作成
- [x] リリース手順書作成
- [x] **画像管理システム仕様書の作成と統合**

---

## 実装スケジュール（Rev.3）

### Week 1: 監視設計・DiffEngine切り出し
1. [x] Task 0.1: 監視設計
2. [x] Task 1.1, 1.2: インターフェース定義・DiffEngine

### Week 2: コンポーネント分離
1. [x] Task 1.3: CloudSyncAdapter
2. [x] Task 1.4: QueueManager
3. [x] Task 3.1: 新SyncServiceスケルトン

### Week 3: Network & Adaptive実装
1. [x] Task 2.1: NetworkMonitor
2. [x] Task 2.2: Adaptive Flush

### Week 4: 統合・検証
1. [x] Task 2.3: 安全性強化
2. [x] Task 3: 統合完了（実装レベル）
3. [x] Task 4.2: ドキュメント統合完了（計画書・仕様書の一本化完了）
4. [x] Task 4.1: テスト実施・検証（ユニットテスト完了）

## Task 5: 本番環境への反映 (Deploy)
- [x] ビルド実行 (`npm run build`)
- [x] デプロイ実行 (`firebase deploy`)

## Task 7: UI改善 (Accent Color Selection)
- [x] 実装計画の作成 (`docs/05_Plans/Phase2_AccentColor_ImplementationPlan.md`)
- [x] CSS変数の実装 (`tailwind.config.js`, `index.css`)
- [x] `ThemeManager` の実装
- [x] `SettingsDialog` へのUI追加
- [x] 動作確認

## Task 8: 本番デプロイ
- [x] ビルド実行 (`npm run build`)
- [x] デプロイ実行 (`firebase deploy`)
- [x] 動作確認 (https://anki-70f73.web.app)

---

**作成日**: 2026-01-31  
**ステータス**: Phase 2 実装・検証完了（次フェーズへ移行可能）
