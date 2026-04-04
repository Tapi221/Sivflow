# XLSXインポートのユニットテスト実装計画

## 概要
`parseXlsxImport` 関数の動作を保証するため、Vitest を使用したユニットテストを追加し、CI/CD やローカルでの検証フロー（`preflight`）に組み込みます。

## 実施事項

### 1. ユニットテストの作成
- ファイルパス: `tests/unit/parseXlsxImport.test.ts`
- テスト内容:
  - **正常系**: 有効な `blocks` シートを読み込み、期待通りの `payload`（カードとブロックの構造）が生成されること。
  - **異常系（シート欠損）**: `blocks` シートがない場合に `missing_sheet` エラーを返すこと。
  - **異常系（ヘッダー欠損）**: 必須ヘッダー（`cardId`, `blockOrder`, `type`）がない場合に `missing_required_header` エラーを返すこと。
  - **異常系（未対応タイプ）**: `type=image` が含まれる場合に `unsupported_image_cell` エラーを返すこと。
  - **異常系（順序重複）**: 同じ `cardId` 内で `blockOrder` が重複した場合に `duplicate_block_order` エラーを返すこと。
  - **境界系（警告）**: `mixed_title_in_same_card`（タイトルの混在）や `unexpected_value`（コード以外での言語指定）が警告として記録されつつ、パース自体は成功すること。

### 2. package.json の更新
- `preflight` スクリプトの `vitest run` に新しく作成したテストファイル `tests/unit/parseXlsxImport.test.ts` を追加します。

## 影響範囲
- 開発時のテストランナー
- インポートモジュールの信頼性向上

## 確認事項
- [ ] `npm run test tests/unit/parseXlsxImport.test.ts` がパスすること
- [ ] `preflight` スクリプトが全テストを正しく実行すること
- [ ] 依存ライブラリ `xlsx` がテスト環境で正しく認識されていること
