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

# 不具合修正：空カードの保存防止
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_prevent_empty_card_save.md) <!-- id: 700 -->
- [x] 修正実装（CardEditor.tsx, useCards.ts） <!-- id: 701 -->
- [x] 動作確認 <!-- id: 702 -->

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
# 不具合修正：初期化エラー (DatabaseClosedError / cn is not defined / ReferenceError) の解決

- [x] 原因調査（LocalDB 多重インスタンス化・初期化順序の特定） <!-- id: 2200 -->
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_fix_initialization_errors.md) <!-- id: 2201 -->
- [/] 修正実装（LocalDB インポート統一, DataIntegrityService 修正等） <!-- id: 2202 -->
- [ ] 動作確認（ビルド成功・ReferenceError 消失確認） <!-- id: 2203 -->
- [ ] 本番環境への反映 (Deploy) <!-- id: 2204 -->

# ブロックUI改善：ボタンのレイアウト最適化
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_compact_block_buttons_fix.md) <!-- id: 3000 -->
- [x] レスポンシブなボタンレイアウトの実装 (BlockEditor.tsx) <!-- id: 3001 -->
- [x] 動作確認と完了報告 (docs/06_Operations/walkthrough_compact_block_buttons_fix.md) <!-- id: 3002 -->

# ブロックUI改善：余白削減と表示最適化
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_reduce_block_padding.md) <!-- id: 800 -->
- [x] テキスト・数式・メモブロックの余白削減実装 <!-- id: 801 -->
- [x] サブフォルダ表示の折りたたみ機能実装 (`FolderView.jsx`) <!-- id: 802 -->
- [x] 本番環境への反映 (Deploy) <!-- id: 803 -->

# ショートカットキー説明の追加
- [x] 実装計画の作成 (docs/04_Reference/implementation_plan_shortcut_keys_settings.md) <!-- id: 900 -->
- [x] 設定画面へのショートカットキー説明タブ実装 <!-- id: 901 -->
- [x] ショートカットキー仕様書の作成 (`docs/04_Reference/shortcut_keys_specification.md`) <!-- id: 902 -->
- [x] 本番環境への反映 (Deploy) <!-- id: 903 -->

# ブロック並び替え挙動の修正
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_block_ordering_fix.md) <!-- id: 1000 -->
- [x] 並び替え同期ロジックの改善 (BlockOrdering.tsx) <!-- id: 1001 -->
- [x] 本番環境への反映 (Deploy) <!-- id: 1002 -->

# KaTeXプレビュー表示不具合の修正
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_katex_preview_fix.md) <!-- id: 2000 -->
- [x] 修正実装 (MathRenderer.tsx) <!-- id: 2001 -->
- [x] 本番環境への反映 (Deploy) <!-- id: 2002 -->

# 不具合修正：KaTeX保存エラー (TypeError) の解決
- [x] 原因調査（Flashcard.tsx のレンダリングロジック不備） <!-- id: 2100 -->
- [x] 修正実装（Flashcard.tsx, MathBlock.tsx, useCards.ts） <!-- id: 2101 -->
- [x] 本番環境への反映 (Deploy) <!-- id: 2102 -->

# カード編集画面のモバイル表示最適化
- [x] 現状の仕様確認 <!-- id: 100 -->
    - [x] `src/Components/card/CardEditor.tsx` の確認 <!-- id: 101 -->
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_editor_mobile_fix.md) <!-- id: 102 -->
- [x] モバイル最適化の実装 <!-- id: 103 -->
- [x] 動作確認 <!-- id: 104 -->
- [x] 本番環境への反映 (Deploy) <!-- id: 105 -->

# IDE警告の解消およびスタイルのクリーンアップ
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_fix_ide_warnings.md) <!-- id: 4000 -->
- [x] インラインスタイルの移行 (index.css, 各コンポーネント) <!-- id: 4001 -->
- [x] ID重複の解消 (MediaUploader.tsx, CardEditor.tsx) <!-- id: 4002 -->
- [x] 動作確認 <!-- id: 4003 -->

# カード閲覧時のテキスト選択防止
- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_prevent_text_selection_view.md)
- [x] 修正実装 (Flashcard.tsx)
- [x] 動作確認 (docs/06_Operations/walkthrough_prevent_text_selection_view.md)

# テキスト・コードブロックの縦幅最適化

- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_compact_blocks.md) <!-- id: 8000 -->
- [x] テキスト・コードブロックのパディングおよび最小高さの削減 <!-- id: 8001 -->
- [x] 動作確認と完了レポート作成 (walkthrough.md) <!-- id: 8002 -->

# タグ管理機能の実装
- [x] 実装計画の作成 (implementation_plan_tag_management_add_feature.md) <!-- id: 6000 -->
- [x] タグ追加UIの実装 (SettingsDialog.jsx) <!-- id: 6001 -->
- [x] ビルド確認 <!-- id: 6002 -->
- [x] 実装完了レポート作成 (walkthrough_tag_management_feature.md) <!-- id: 6003 -->

# PDFドキュメント用テーブル `documents` の追加 (PDFサポート)
- [x] `src/types/index.ts` の型定義追加 (Document, PdfDocument) <!-- id: 7000 -->
- [x] `src/services/localDB.ts` のテーブル追加とスキーマ更新 <!-- id: 7001 -->
- [x] `localDB.ts` の既存バグ・タイポ修正 <!-- id: 7002 -->
- [x] 動作確認とレポート作成 <!-- id: 7003 -->

# ExplorerItem統一モデルの導入とリファクタリング
- [x] 実装計画の作成 <!-- id: 7201 -->
- [x] ExplorerItem/SelectedExplorerItem 型定義の追加 <!-- id: 7202 -->
- [x] FolderTreeWithCards.tsx のリファクタリング <!-- id: 7203 -->
- [x] Folders.jsx / TreeViewLayout.tsx の選択状態統合 <!-- id: 7204 -->
- [x] 動作確認と型チェック <!-- id: 7205 -->

# ExplorerにおけるPDFドキュメントの表示
- [x] 実装計画の作成 <!-- id: 7100 -->
- [x] `useDocuments` フックの作成 <!-- id: 7101 -->
- [x] Explorer/FolderTree への PDF 表示統合 <!-- id: 7102 -->
- [x] PDFクリック時のオープン処理実装 <!-- id: 7103 -->
- [x] 動作確認 <!-- id: 7104 -->
# カード編集画面のレイアウト最適化（1行44px・罫線実装）

- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_card_layout_ruled_lines.md) <!-- id: 1100 -->
- [x] カードシェルの3層構造（Background/Guide/Content）の実装 <!-- id: 1101 -->
- [x] 24px間隔の罫線と行高さ（line-height: 24px）の整合実装 <!-- id: 1102 -->
- [x] 各ブロックの最小高さ（min-height: 44px）の確保 <!-- id: 1103 -->
- [x] 動作確認と仕様書の更新 <!-- id: 1104 -->

# 音声・リンクマークの配置とサイズ統一

- [x] 実装計画の作成 (docs/06_Operations/implementation_plan_align_audio_link_icons.md) <!-- id: 1201 -->
- [x] 音声バッジの実装・配置変更 (Flashcard.tsx) <!-- id: 1202 -->
- [x] StudyCard.tsx の冗長なボタン削除とスタイル調整 <!-- id: 1203 -->
- [x] 動作確認 <!-- id: 1204 -->
