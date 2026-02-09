# 同期システム概要と現状（サマリ）

最終更新: 2026-02-05

## 概要

本ファイルはリポジトリ内の同期機能（クライアント⇄Firestore）実装を調査し、構成・責務・現状の課題、優先的な改善案を簡潔にまとめたものです。

## アーキテクチャ（主要コンポーネント）

- `SyncServiceV2`（オーケストレーター） — 差分取得（pullDiff）→ 適用（applyRemoteChanges）→ ローカル変更送信（processBatch）の主要フローを制御します。Telemetry/NetworkMonitor/QueueManager/CloudAdapter などを注入して動作します。
- `SyncServiceFactory` — フラグで V2 / Legacy を切り替えるファクトリ。
- `QueueManager` / `operationQueue` — ローカル永続キュー（Dexie）の管理、圧縮ルール、優先度、再試行、DLQ 相当の処理を行います。
- `NetworkMonitor` — 同期コンテキスト（user_initiated / background 等）とネットワーク健全度に基づくバッチ制約を返します。
- `DiffEngine` — 差分計算・マージ・循環参照検出などの純粋ロジック。
- `CloudSyncAdapter` — Firestore との I/O 抽象（pullDiff / pushBatch / pullFull）。
- `LocalDB`（Dexie） — `syncQueue`, `conflicts`, `cards`, `folders` 等のローカル永続層。

（該当ファイル）: `src/services/SyncServiceV2.ts`, `src/services/SyncServiceFactory.ts`, `src/services/logic/CloudSyncAdapter.ts`, `src/services/localDB.ts`, `src/services/operationQueue.ts`, `src/services/logic/DiffEngine.ts`, `src/services/logic/NetworkMonitor.ts`。

## 現状の実装の強み

- オーケストレーター設計により関心分離がされており、差分ロジック・キュー・ネットワーク判定・クラウド I/O が独立している。
- ローカルの永続キューと圧縮ルールにより、オフラインでの操作保存と再送が考慮されている。
- 競合検出（merge の conflict フラグ）と `conflicts` テーブルへの記録が組み込まれている。
- Telemetry / SecurityMonitor による計測・イベント記録のフックがある。

## 主な課題・リスク（短期的優先）

- `CloudSyncAdapter.pushBatch` が Firestore のバッチ上限（500 書き込み）を分割していない。大量バッチで失敗する可能性。
- `pullDiff` は `updatedAt > since` を用いる単純クエリで、ページネーションや大量変更時の安定化措置が未実装。
- 競合は検出して保存されるが、ユーザー向けの解決フロー（UI・自動或いは半自動解決）が未整備。
- 一部処理で全件読み出し（`.toArray()` 等）が発生しており、大データでの性能問題が懸念される。

## 推奨改善（短期）

1. `pushBatch` に 500 件ごとのチャンク分割と個別リトライを実装する。
2. `pullDiff` にページネーション（cursor/limit）を導入し、増分取得を安全に行う。
3. `conflicts` の解決ワークフロー（一覧表示・差分プレビュー・採用/破棄操作）を実装する。
4. `peekBatch` / キュー読み出し処理のストリーミング化やインデックス使用で効率化。

## 推奨改善（中長期）

- 統合テスト（pull/push の E2E）と障害注入テストを追加して回帰を防ぐ。
- サーバ側での補助的検証（整合性チェック、部分的マージ）や監視（メトリクス / アラート）を整備する。

## 次の実作業候補（自動で実装可能）

1. `CloudSyncAdapter.pushBatch` のチャンク化パッチを作成・テスト（推奨・優先度高）。
2. `pullDiff` のページネーションと cursor 化の設計・実装。
3. `docs/` 内に「競合解決 UX 案」を追加して UI 実装に橋渡し。

必要であれば、1 をすぐに実装します（パッチ作成 → 単体テスト追加 → PR 作成）。どれを進めますか？
