# IDEエラーおよび依存関係の修正実装計画

## 概要
現在、`main.tsx` や `localDB.ts` などで `dexie`, `@react-oauth/google`, `@tanstack/react-query`, `@sentry/react` などのモジュールが見つからない、または型定義が読み込まれないというエラーが発生しています。
これは `package.json` には依存関係が含まれているものの、TypeScript コンパイラ (IDE) が型定義を解決できていないことが原因です。
`tsconfig.app.json` の設定を調整し、これらの型定義を明示的、あるいは適切に読み込めるように修正します。

## 変更内容

### 1. `tsconfig.app.json` の修正
`compilerOptions.types` 配列に、解決できていない以下のライブラリを追加します。
これにより、コンパイラが強制的にこれらの型定義を認識するようにします。

- `dexie`
- `@react-oauth/google`
- `@tanstack/react-query`
- `@sentry/react`

※ 現状の `tsconfig.app.json` は `"types": ["vite/client", "node"]` となっており、これ以外のグローバル型（あるいはモジュール解決がうまくいかない型）が無視されている可能性があります。

#### [MODIFY] [tsconfig.app.json](file:///c:/FlashcardMaster/tsconfig.app.json)

```json
{
  "compilerOptions": {
    // ...
    "types": [
      "vite/client",
      "node",
      "dexie", 
      "@react-oauth/google", 
      "@tanstack/react-query", 
      "@sentry/react"
    ],
    // ...
  }
}
```

### 2. `LocalDBLike` 型不整合の解消（必要であれば）
`InMemoryLocalDB` は既に必要なメソッド (`open`, `close` 等) を実装しているようですが、`LocalDB` 側が `Dexie` の型定義を読み込めていないためにエラーになっていると推測されます。
手順1の修正で `Dexie` の型が正しく解決されれば、`LocalDB` が正しく `Dexie` を継承し、`name`, `version` などのプロパティを持つと認識されるはずです。
もし `tsconfig` の修正だけで解消しない場合は、`src/services/localDB.ts` または `src/services/InMemoryLocalDB.ts` の型定義を微調整します。

## 検証計画

### 自動テスト
- コマンドラインで `npm run typecheck` を実行し、エラーが解消しているか確認します。
  - 成功条件: エラーが出力されずに終了すること。

### 手動確認
- エラーが出ていたファイル (`main.tsx`, `localDB.ts` 等) を開き、IDE 上の赤線 (エラー表示) が消えていることを確認します。
