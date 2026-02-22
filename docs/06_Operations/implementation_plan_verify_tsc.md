# 型チェック動作検証計画

## 目的
`npm run typecheck` (tsc) が正常終了しているにもかかわらず、IDE 上でエラーが表示される原因を切り分ける。
`localDB.ts` が実際に型チェックの対象になっているかを確認するため、意図的にエラーを発生させる。

## 手順
1. `src/services/localDB.ts` の先頭に、型エラーとなるコード（例: `const test: number = "string";`）を追加する。
2. `npm run typecheck` を実行する。
3. エラーが検出されれば、`tsc` は正しくファイルを認識おり、型定義も解決できている可能性が高い（IDEの設定の問題）。
4. エラーが検出されなければ、`tsc` の対象から外れている（`include`/`exclude` 設定の問題）。
5. 確認後、追加したコードを削除して元に戻す。

## 期待される結果
- エラーが出力されること。

## 次のステップ
- **エラーが出た場合**: `tsc` は正常。IDE の問題の可能性が高いが、`tsconfig.app.json` の互換性を高める設定 (`moduleResolution` の変更など) を試す。
- **エラーが出ない場合**: `tsconfig.app.json` の `include` 設定を見直す。
