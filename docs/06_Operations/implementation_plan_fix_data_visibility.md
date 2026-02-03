# データ表示不具合（カード・フォルダが表示されない）の修正計画

## 概要
ユーザーから「カードやフォルダが表示されない」という報告がありました。
調査の結果、現在有効化されている `SyncServiceV2` および `IndexedDBRebuildOrchestrator` の実装が不完全であり、クラウド（Firestore）からのデータ取得ロジックが `TODO` 状態になっていることが判明しました。
これにより、新規デバイスやキャッシュクリア後の環境でデータが同期されず、表示されない状態になっています。

## 原因
1. `src/features/flags.ts` にて `USE_SYNC_V2` が `true`（有効）になっている。
2. `SyncServiceV2.ts` の `download` 処理が未実装（`// ローカルに適用するロジックは省略`）。
3. `IndexedDBRebuildOrchestrator.ts` の再構築処理も未実装（`// TODO: クラウドからの再同期`）。

## 修正案
安全性を最優先し、十分に検証されているレガシーな `SyncService` に切り戻します。

### [MODIFY] [flags.ts](file:///c:/FlashcardMaster/src/features/flags.ts)
- `USE_SYNC_V2` を `false` に変更し、段階的ロールアウトを一時停止します。

## 検証プラン
1. 修正版をビルドし、デプロイします。
2. アプリにアクセスし、レガシー同期によって Firestore からデータが正しく取得されることを確認します。
3. カードおよびフォルダが表示されることを確認します。

## 注意事項
- Firebase Functions の Node.js 18 廃止によるデプロイ失敗が発生していますが、本件のデータ表示内容（Firestoreとの通信）自体は直接 Functions に依存していないため、この切り戻しで表示問題は解決する見込みです。
- 本番デプロイにはビルドが必要なため、Functions の Node バージョンも併せて修正検討が必要かもしれません。まずはフラグの変更とデプロイを試みます。
