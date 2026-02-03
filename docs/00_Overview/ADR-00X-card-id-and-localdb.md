
````md
# ADR-003: カード識別子の統一と LocalDB 正設計

## ステータス
Accepted

## 日付
2025-01-XX

## コンテキスト

本アプリでは以下の課題が顕在化していた。

- カード識別子が `id` と `cardId` の2系統存在していた
- 一覧表示が Firestore 直読みと LocalDB 読み取りで混在していた
- カード追加後に一覧へ反映されない不具合が発生していた
- snake_case / camelCase の混在により表示・同期バグが発生していた

同期システムは「LocalDB 正・Firestore は同期専用」という方針へ進化しており、
UI と同期の責務を明確に分離する必要があった。

---

## 決定

### 1. カード識別子を `id` に統一する

- `cardId` フィールドは廃止する
- 新規コード・型定義・UI は `id` のみを使用する
- 旧データ互換のため、読み取り時のみ一時的に互換対応を行う

```ts
const id = raw.id ?? raw.cardId;
````

* この互換対応は 4週間後に完全削除する

---

### 2. 一覧表示の正を LocalDB に統一する

* Firestore 直読みを全面的に廃止する
* 一覧・編集・学習はすべて LocalDB から読み取る
* Firestore は push / pull の同期用途のみに限定する

---

### 3. カード追加後は即時 `setCards` で一覧へ反映する

* `createCard` は LocalDB に保存後、カードオブジェクトを返却する
* UI 側で即時 `setCards` により一覧へ追加する
* 自動的な再取得は行わない

再取得を行うのは以下の場合のみとする。

* フォルダ切替時
* アプリ再起動時
* ユーザーによる明示的なリロード操作時

---

### 4. snake_case データは読み取り正規化のみで対応する

* 内部状態および保存形式は camelCase に統一する
* 旧データは `normalizeCard()` 関数で吸収する
* 永続的なマイグレーションは行わない

```ts
function normalizeCard(raw: any): Card {
  return {
    id: raw.id ?? raw.card_id,
    folderId: raw.folderId ?? raw.folder_id,
    questionText: raw.questionText ?? raw.question_text,
    answerText: raw.answerText ?? raw.answer_text,
    isDeleted: raw.isDeleted ?? raw.is_deleted ?? false,
    orderIndex: raw.orderIndex ?? raw.order_index ?? 0,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}
```

---

## 結果

* カード追加後に一覧が即座に更新される
* オフライン時もオンライン時と同一の UX を実現する
* 同期と UI 状態管理が完全に分離される
* ID 不整合および「表示されない」系の不具合が構造的に解消される

---

## 将来対応

* 4週間後に `cardId` 互換読み取りコードを削除する
* `normalizeCard` は将来の schema 変更時にも再利用する

---

## 関連 ADR

* ADR-001: LocalDB 正同期設計
* ADR-002: 同期キューと競合解決設計

```
