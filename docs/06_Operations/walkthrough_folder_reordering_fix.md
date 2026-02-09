# フォルダ並び替え時の水平移動防止 実施報告

## 変更概要
フォルダ管理画面での並び替え時に、フォルダが水平方向（横）に移動してしまう問題を修正しました。
ドラッグ＆ドロップの移動を垂直方向（縦）のみに強制的に制限することで、視覚的な安定性を向上させました。

## 実施内容

### `src/Components/folder/FolderTree.tsx` の修正

1.  **ヘルパー関数 `restrictToVertical` の追加**
    - `transform` プロパティ（`translate` または `translate3d`）を解析し、X軸の移動量を常に `0px` に書き換えるロジックを実装しました。

2.  **`Draggable` コンポーネントへの適用**
    - `FolderItem` コンポーネント内のドラッグ対象要素（`div`）に対し、上記の関数を通したスタイルを適用するように変更しました。

```typescript
// 実装イメージ
const restrictToVertical = (style) => {
  if (style?.transform) {
    // translate(...) のX値を0pxに置換
    // ...
    return { ...style, transform: `translate(0px, ${y})` };
  }
  return style;
};

// ...
<div 
  style={restrictToVertical(provided.draggableProps.style)}
  {...provided.draggableProps}
>
```

## 検証結果

### 手動検証（コードレベル確認）
- ヘルパー関数が正しく定義され、ドラッグ要素の `style` プロパティに適用されていることを確認しました。
- 正規表現による `transform` 値の解析が、`translate` と `translate3d` の両方のパターンに対応していることを確認しました。
