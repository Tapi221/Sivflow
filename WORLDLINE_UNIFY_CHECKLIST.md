# 世界線統合チェックリスト (Worldline Unify Checklist)

目的: フォルダ作成が「保存されているが UI に見えない」現象を永久に排除するための本番向け手順。診断コードではなく、不変条件と運用ルールを残す。

1) 強制不変条件の常設化（本番でも残す）

```ts
const id = await db.addItem('folders', folder);
const saved = await db.folders.get(id);
if (!saved) {
  throw new Error('Invariant violated: write-read mismatch (DB instance split)');
}
```

- 意味: 書いた DB から直後に読めない場合は設計破壊（インスタンス分裂）。即時失敗で早期発見。

2) `LocalDB` のシングルトン化を文化にする（構文レベルで厳守）

- エクスポートは以下のみ:
  - `export function getLocalDb(): LocalDB`
  - `export function initializeDB(userId: string): void`
- 禁止: `new LocalDB(...)` と `new Dexie(...)` をブラウザコードで直に呼ばないこと。
- コンストラクタガードは正当。違反コードは即座にクラッシュさせる。

3) 保存時正規化は DB 層の責務

保存は常に正規化済みオブジェクトを DB に渡すこと。

```ts
function normalizeFolder(input) {
  return {
    id: generateId(),
    userId: assertUserId(),   // undefined 禁止
    isDeleted: false,         // true を勝手に許容しない
    parentFolderId: input.parentFolderId ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
}
```

- UI は正規化済みデータを前提に描画する。UIで`undefined`を吸収する実装は避ける。

4) 観測ログは症状が消えるまで残す（運用）

```ts
useLiveQuery(async () => {
  const all = await db.folders.toArray();
  console.log('[OBSERVE]', db.name, all.length, all.slice(0,3));
  return all;
}, [db.name]);
```

- 0 件 → インスタンス分裂（世界線が違う）
- >0 件だが UI に出ない → フィルタ不整合

5) UI は沈黙しない（ユーザー通知）

```ts
try {
  await createFolder();
  toast.success('フォルダを作成しました');
} catch (e) {
  toast.error('フォルダ作成に失敗しました');
}
```

- 失敗を UI に返すことで調査コストを大幅に下げる。

運用メモ:
- 開発中は観測ログを残す。問題が完全に消えたら、ログと即時検査を残すかどうかは運用方針で決める（安全装置として残すことを推奨）。
- CLI 用スクリプト（Node）では `new LocalDB(userId)` を使ってもよいが、ブラウザ動作での再発を防ぐため、可能ならスクリプトも `initializeDB()` を使うよう改修すること。

結論: インスタンス分裂と保存正規化不足を設計レベルで封じ込めれば、この現象は再発しない。上のルールをコードベースの「掟」として残すこと。
