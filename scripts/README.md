# scripts/README.md — スクリプト一覧と実行手順

最終更新: 2026-04-11

このファイルは `scripts/` 配下のユーティリティスクリプトについて目的、リスク、実行例をまとめたものです。スクリプトは DB やデータを変更するものが多いため、実行前に必ずスナップショットを取得してください。

---

## 実行に共通する前提

- Node と npm がインストールされていること
- TypeScript スクリプトは `ts-node` で実行可能（`npx ts-node <path>`）
- 重要データはスナップショット（`SnapshotService` によるエクスポート）でバックアップする

---

## スクリプト一覧

- `card_simulation.ts`
  - 目的: 復習アルゴリズムやカードの状態遷移をローカルでシミュレーションする。挙動確認用。
  - 実行: `npx ts-node scripts/card_simulation.ts`
  - リスク: 読み取り専用の設計だが、修正するバリエーションがあるため実行前に内容確認を推奨。

- `card_data_patch.ts`
  - 目的: 既存データのバルク修正（例: フィールド名変更、値変換）。
  - 実行例: `npx ts-node scripts/card_data_patch.ts --dry-run`（`--dry-run` をサポートしている場合）
  - リスク: DB を書き換えるため、本番データでは必ずスナップショットを取得し、ステージングで検証してください。

- `migrateBase64.ts`
  - 目的: 画像/音声の Base64 形式からの移行処理。メディアの正規化を行う。
  - 実行: `npx ts-node scripts/migrate/migrateBase64.ts`
  - リスク: 大きなファイルを扱う可能性があるためメモリに注意。分割実行を検討してください。

- `verify_migration.js`
  - 目的: マイグレーションの整合性チェック。Node で実行する簡易スクリプト。
  - 実行: `node scripts/verify/verify_migration.js`
  - リスク: 検証ツールですが、オプションで修正を行う場合は注意。

- `verify_security_signal.ts`
  - 目的: セキュリティシグナルの検証・モック送信ツール。
  - 実行: `npx ts-node scripts/verify/verify_security_signal.ts`
  - リスク: テスト用のセキュリティログを生成するため、本番環境ではテストアカウントを利用してください。

- `generate-pptx-ja-sample.mjs`
  - 目的: PPTX→PDF→PNG 変換で、日本語フォント欠落（豆腐）や置換によるレイアウト崩れを再現・回帰確認するためのサンプル PPTX を生成する。
  - 実行: `node scripts/generate-pptx-ja-sample.mjs`（`--out <dir>` で出力先指定）
  - リスク: ローカルにファイルを書き出すのみ（DB 書き換えなし）。

---

## 安全な実行手順（推奨）

1. スナップショット取得（ローカル）

```powershell
npx ts-node scripts/card_simulation.ts # 読み取り専用の確認
```

2. ステージング環境で `--dry-run` を実行（スクリプトが対応している場合）

3. 本番実行前にチームとロールアウト計画を共有する

---

## 追加作業提案

- 各スクリプトに `--dry-run` と `--yes` フラグを追加して安全性を高める。
- スクリプト実行前に自動で `SnapshotService.createSnapshot()` を呼ぶラッパーを作成することを推奨します。
