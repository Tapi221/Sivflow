# 実装計画: リスト表示のレイアウト最適化

## 概要
ユーザーの要望に基づき、カード一覧のリスト表示（`viewMode === 'list'`）のデザインを調整します。
現状の「縦に長い」レイアウトから、「縦幅を抑えつつ横幅を広く使う」レイアウトに変更し、一覧性を向上させます。

## 変更内容

### [src/Components/card/CardList.tsx](file:///c:/FlashcardMaster/src/Components/card/CardList.tsx)

1.  **コンテナの横幅拡張**:
    *   `CardList` コンポーネントのグリッドレイアウトにおいて、`viewMode === 'list'` 時の `max-w-3xl` (約768px) 制限を緩和または撤廃し、`max-w-5xl` 等へ拡張します。

2.  **カードアイテムのレイアウト変更 (`CardItem`)**:
    *   `viewMode === 'list'` の場合、`flex-col` (縦積み) ではなく `flex-row` (横並び) に近いレイアウトに変更します。
    *   **左側**: ステータス、耐性スコア、タグなどをコンパクトに配置。
    *   **中央**: 質問テキストと答えテキストを横並び、あるいは上下でも行数を減らして配置。
    *   **右側**: 編集・削除ボタンなどを配置。

**具体的なスタイル変更案:**

*   **コンテナ**: `max-w-3xl` -> `max-w-5xl` (または `max-w-none` で親に委ねる)
*   **カード**:
    *   `p-5` -> `p-3` (パディング削減)
    *   `items-stretch` -> `items-center` (リストっぽく)
    *   `flex-col` -> `flex-row` (要素を横に並べる)
*   **中身**:
    *   ヘッダー部分（スコア、タグ）の余白削減。
    *   質問テキストのフォントサイズ調整（必要であれば）。
    *   Answerの表示をコンパクト化。

## デザイン案 (List Mode)

```tsx
<div className="flex flex-row items-center gap-4 p-3 ...">
  {/* Left: Status / Checkbox */}
  <div className="flex items-center gap-2 shrink-0">
    <Checkbox />
    <span className="text-lg font-bold">80%</span>
  </div>

  {/* Center: Content */}
  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
    <div className="truncate font-bold text-base">{question}</div>
    <div className="truncate text-sm text-slate-500">{answer}</div>
  </div>

  {/* Right: Actions */}
  <div className="flex items-center gap-2 shrink-0">
    <Tags />
    <EditButtons />
  </div>
</div>
```

## 検証計画
1.  `FolderView` でリスト表示に切り替える。
2.  カードの高さが以前より低くなっていることを確認する。
3.  横幅が広く使われていることを確認する。
4.  長いテキストが適切に省略（truncate）または折り返されるか確認する。
5.  モバイル表示でも崩れないか確認する（モバイルは縦積みのままにするか、レスポンシブ対応）。

## 注意点
*   モバイルの場合は `flex-col` に戻すなど、レスポンシブ対応を組み込む。
*   `viewMode === 'grid'` には影響を与えないようにする。
