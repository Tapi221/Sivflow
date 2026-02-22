# LocalDB.transaction 修正計画

## 調査結果
`Dexie` の型定義を確認し、`PromiseExtended` の正確なエクスポートと `transaction` メソッドのシグネチャを特定する。

## 修正案

### 1. PromiseExtended のインポート
もし `import { PromiseExtended }` ができない場合、`Dexie.PromiseExtended` または別のパスからのインポートを試みる。
`dexie` パッケージは通常 `export interface PromiseExtended ...` しているはずだが、名前空間の中にあるかもしれない。

### 2. transaction シグネチャの適合
`Dexie` の `transaction` はオーバーロードされている可能性がある。
最も汎用的なシグネチャ（`tables` が `(string | Table)[]` など）に合わせて、`LocalDB` のオーバーライドを修正する。

```typescript
// 想定される修正後のシグネチャ
async transaction<T>(mode: string, tables: any, scope: (trans?: any) => Promise<T> | T): PromiseExtended<T> {
  return super.transaction(mode as any, tables, scope);
}
```
※ `PromiseExtended` の型が特定できたらそれを適用。最悪 `Promise<T> & { timeout?: any }`などの交差型や `any` を使用して回避する（`Dexie` を継承している以上、互換性は必須）。

## 検証
`npm run typecheck` を実行。
