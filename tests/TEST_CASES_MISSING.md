# Missing test case entries for tests/TEST_CASES.md

`tests/TEST_CASES.md` に未記載だった実在テストファイルとケースの追記候補です。

## tests/src/tests/statistics.spec.ts

- [ ] reviewCount が 0 の場合、isReviewed は false を返す
- [ ] reviewCount が 0 より大きい場合、isReviewed は true を返す
- [ ] lastReviewAt が存在しても reviewCount が 0 なら isReviewed は false を返す
- [ ] レビュー済みカードがない場合、calculateAverageStability は null を返す
- [ ] calculateAverageStability はレビュー済みカードだけで平均を計算する
- [ ] レビュー済みカードが 1 枚だけの場合、calculateAverageStability はその安定度を返す

## tests/unit/features/deckFile/mfDeckZipCodec.test.ts

- [ ] manifest.json と cards.json と media を含む mfdeck を往復できる
- [ ] mfdeck v1 ではない manifest を拒否する
- [ ] 重複した card id を拒否する

## tests/unit/features/import/importPortableFileBatch.test.ts

- [ ] mfdeck/mfcard だけを重複除去してキュー化する
- [ ] 表示用サブタイトルを作る
- [ ] mfcard を新規カードセットとして一括インポートする

## tests/unit/platform/desktopHandwritingReceiver.test.ts

- [ ] アクティブなインク文書に stroke delta を適用する
- [ ] 別 session 宛ての message を拒否する
- [ ] 別 card または side 宛ての message を拒否する
- [ ] 制御 message から session status の変更を返し、document は変更しない

## tests/unit/services/reviewAlgorithm.test.ts

- [ ] 初回レビューをすべて同じ 1 日間隔に固定しない
- [ ] 記録された耐性スコアを間隔からスコアへの対応と一致させる

## tests/unit/tests/reviewMetrics.test.ts

- [ ] 安定度が固定なら間隔が長いほど保持確率は下がる
- [ ] 間隔が長いほど耐性スコアは上がる
- [ ] 耐性スコアの境界値と代表値を確認する
- [ ] 安定度フェーズは保持確率に基づいて分類される
