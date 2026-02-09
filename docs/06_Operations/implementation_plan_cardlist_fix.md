# CardList.tsx 修正計画

## 概要
`CardList.tsx` における以下の問題を修正します。
1.  TypeScriptエラー: `Property 'style' does not exist on type '{}'` (line 74)
2.  Lint警告: `CSS inline styles should not be used` (line 72)

## 変更内容

### `src/Components/card/CardList.tsx`

#### [MODIFY] `renderCardContent` 関数の型定義修正とLint抑制

*   **現状**: `renderCardContent` の引数 `draggableProps` がデフォルト値 `{}` により空オブジェクトとして推論されており、`style` プロパティへのアクセスでエラーが発生しています。また、ドラッグ＆ドロップライブラリ (`@hello-pangea/dnd`) が動的にスタイルを適用するために必要なインラインスタイルがLint警告を出しています。
*   **変更**:
    *   `draggableProps` に適切な型 (`DraggableProvidedDraggableProps` または `any`) を付与します。
    *   インラインスタイル警告に対し、ライブラリの仕様上必要であることを明記し、`eslint-disable-next-line` (または適切な抑制コメント) を追加します。
    *   TypeScriptの型エラーを回避するため、`draggableProps` のデフォルト値 `{}` が原因で `{}` 型と推論されるのを防ぐため、型注釈を追加します。

```tsx
// 変更イメージ
const renderCardContent = (
    ref: React.Ref<any> | null = null,
    draggableProps: any = {}, 
    dragHandleProps: any = {}, 
    style: React.CSSProperties = {}, 
    isDragging: boolean = false
) => {
    // ...
    <div
      ref={ref}
      // eslint-disable-next-line react/forbid-dom-props
      style={{ ...style, ...draggableProps.style }}
      // ...
    >
}
```

## 検証計画

### 自動テスト
*   修正後、IDE上でのエラー・警告が消えていることを確認します（ユーザーに確認を依頼）。

### 手動機能テスト
*   アプリケーションを起動し、カードリストの表示が崩れていないか確認します。
*   カードのドラッグ＆ドロップ機能が正常に動作することを確認します。
