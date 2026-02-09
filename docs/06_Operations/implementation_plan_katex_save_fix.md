# KaTeX保存エラー修正実装計画 (Implementation Plan)

KaTeX数式ブロックを使用またはカード保存・表示する際に発生する `TypeError: Cannot read properties of undefined (reading 'latex')` を修正します。

## 原因分析

1. **表示側の不具合 (`Flashcard.tsx`)**: 
   - `renderBlocks` 関数内で、ブロックのタイプに関わらず `block.math.latex` を参照している。
   - `text` や `code` ブロックなど、`math` プロパティを持たないブロックが表示される際に `undefined.latex` となりクラッシュする。

2. **入力側の不備 (`MathBlock.tsx`)**:
   - `data.latex` へのアクセスが直接的であり、不測の事態（データ破損など）で `data` が不完全な場合にエラーになる可能性がある。

3. **保存時の考慮不足 (`useCards.ts`)**:
   - 保存前のバリデーションや正規化で、`math` ブロックの構造が完全であることを保証する仕組みが弱い。

## 提案される変更

### 1. 表示ロジックの修正: [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)

- `renderBlocks` 内の `MathRenderer` 呼び出しを `block.type === 'math'` の条件分岐内に移動します。
- `block.math?.latex` のように、オプショナルチェイニングを使用して安全にアクセスします。

### 2. コンポーネントの安全性向上: [MathBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/MathBlock.tsx)

- `data.latex` 参照箇所にオプショナルチェイニングやデフォルト値を適用します。

### 3. バリデーションの強化: [useCards.ts](file:///c:/FlashcardMaster/src/hooks/useCards.ts)

- `createCard` および `updateCard` (または共通のバリデーション層) において、`math` タイプのブロックが適切な構造を持っているか確認し、不足している場合は補完します。

---

## 変更詳細

### [MODIFY] [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)

- `renderBlocks` 内で、各ブロックタイプに対応したレンダリングを行います。
- `math` ブロック専用のレンダリング位置を修正します。

### [MODIFY] [MathBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/MathBlock.tsx)

- Props から受け取った `data` のプロパティアクセスを安全にします。

### [MODIFY] [useCards.ts](file:///c:/FlashcardMaster/src/hooks/useCards.ts)

- ブロックの保存前に構造をチェックするヘルパーを追加、または `normalizeCard` 側で math ブロックの不備を補完するように調整します。

---

## 検証計画

### 自動テスト
- 現状、KaTeX関連のユニットテストが不足しているため、手動検証を中心に実施します。

### 手動検証
1. **既存カードの表示確認**: KaTeXブロックを含むカードと、含まないカード（テキストのみなど）の両方が正しく表示されることを確認。
2. **新規KaTeXブロックの作成**: 新しくKaTeXブロックを追加し、入力を空のまま保存してもエラーにならないことを確認。
3. **プレビュー機能の確認**: 編集画面の「プレビュー」ボタンで、KaTeXが正しくレンダリングされ、エラーが発生しないことを確認。
4. **異常系の確認**: 万が一データが `math: null` のような状態になっても、画面が真っ白にならずにエラーメッセージまたは空表示で持ちこたえることを確認。
