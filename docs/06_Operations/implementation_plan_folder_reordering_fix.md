あと# フォルダ並び替え時の水平移動防止 実装計画

## 概要
フォルダ管理画面において、フォルダをドラッグして並び替える際に、水平方向（横）に移動してしまう挙動を修正します。ドラッグ移動を垂直方向（縦）のみに制限し、ユーザー体験を向上させます。

## 現状の課題
- `FolderTree.tsx` において、`@hello-pangea/dnd` のデフォルト挙動により、ドラッグ中の要素がマウス/タッチ位置に完全に追従する。
- リスト形式の並び替えでは、横にずれると視覚的に「階層が変わる」ように見えたり、単に整列が崩れて見えるため、垂直方向のみに固定するのが一般的。

## 実装方針
- `src/Components/folder/FolderTree.tsx` の `Draggable` 要素に対し、`style` プロパティの `transform` 値を操作して X軸移動を強制的に `0px` に固定します。
- 既存の `BlockOrdering.tsx` の実装を参考にしつつ、より堅牢な（`translate3d` にも対応可能な）変換ロジックを適用します。

## 変更内容

### src/Components/folder/FolderTree.tsx

`FolderItem` コンポーネント内の `Draggable` の `style` プロパティを以下のように修正します。

```tsx
// ヘルパー関数の追加（またはインライン展開）
const restrictToVertical = (style) => {
  if (style?.transform) {
    // translate(...) または translate3d(...) から Y軸成分のみを抽出して再構築
    // 簡易的な実装として、元の transform から Y 軸の値を抽出する
    // @hello-pangea/dnd は通常 "translate(x, y)" または "translate3d(x, y, z)" を出力する
    
    // Y軸の値を取得するための正規表現
    // translate(x, y) -> Group 2
    // translate3d(x, y, z) -> Group 2
    
    let y = '0px';
    const transform = style.transform;
    
    if (transform.includes('translate3d')) {
       // translate3d(x, y, z)
       const matches = transform.match(/translate3d\([^,]+,\s*([^,]+),\s*[^)]+\)/);
       if (matches) y = matches[1];
       return {
         ...style,
         transform: `translate3d(0px, ${y}, 0px)`
       };
    } else {
       // translate(x, y)
       const matches = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
       if (matches) y = matches[1];
       return {
         ...style,
         transform: `translate(0px, ${y})`
       };
    }
  }
  return style;
};

// レンダリング部分
<div
  ref={provided.innerRef}
  {...provided.draggableProps}
  style={restrictToVertical(provided.draggableProps.style)}
>
```

## 検証計画

### 自動テスト
- 現状、UIのドラッグ＆ドロップ挙動を確認する自動テストはないため、コンパイルエラーがないことのみ確認。

### 手動検証手順
1.  **フォルダ管理画面を開く**
2.  **フォルダのドラッグ開始**
    - 任意のフォルダのハンドル（`::`）を掴んでドラッグを開始する。
3.  **水平移動の確認**
    - マウス/指を左右に大きく動かす。
    - **期待値**: フォルダの表示位置（ゴースト）は左右に動かず、上下（垂直方向）のみに移動すること。
    - **期待値**: 別のフォルダやサブフォルダ領域へのドロップ判定は維持されること（※ドロップ先の判定はマウスカーソルの位置で行われるため、表示が固定されていても機能には影響しないはずだが念の為確認）。
4.  **並び替えの完了**
    - 別の位置でドロップして、正しく並び替わることを確認。
