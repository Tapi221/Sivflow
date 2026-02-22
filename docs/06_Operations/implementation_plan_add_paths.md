# IDEエラー修正のためのパス解決策

## 概要
`npm run typecheck` (tsc) は正常に動作していますが、IDE (VSCode等) が一部のモジュール (`dexie`, `@react-oauth/google`, `@tanstack/react-query`, `@sentry/react`) の型定義を見つけられない状態です。
これは `moduleResolution: "bundler"` の設定下で、IDEが `package.json` の `exports` を解決する際に躓いている可能性があります。
`tsconfig.app.json` の `paths` オプションを使用して、これらのモジュールの型定義ファイルの場所を明示的に指定します。

## 変更内容

### [MODIFY] [tsconfig.app.json](file:///c:/FlashcardMaster/tsconfig.app.json)

`compilerOptions.paths` に以下のマッピングを追加します。

```json
{
  "compilerOptions": {
    // ...
    "paths": {
      "@/*": ["src/*"],
      "dexie": ["./node_modules/dexie/dist/dexie.d.ts"],
      "@react-oauth/google": ["./node_modules/@react-oauth/google/dist/index.d.ts"],
      "@tanstack/react-query": ["./node_modules/@tanstack/react-query/build/modern/index.d.ts"], // ※実際のパスを確認後に確定
      "@sentry/react": ["./node_modules/@sentry/react/types/index.d.ts"] // ※実際のパスを確認後に確定
    }
  }
}
```

※ `@tanstack/react-query` と `@sentry/react` の正確なパスは、`list_dir` の結果に基づいて決定します。

## 検証計画

### 自動テスト
- `npm run typecheck` を実行し、この変更が `tsc` の動作を壊さないことを確認します（エラーが出ないこと）。

### 期待される効果
- IDE 上の "Module ... not found" エラーが解消される。
