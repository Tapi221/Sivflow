# カード編集画面（一問一答モード）での並び替え軸固定

カード編集画面（OneQAMode）において、複数のカードを並び替える際にドラッグが左右にブレないよう、移動を垂直方向（Y軸）のみに制限します。

## Proposed Changes

### 1. [OneQAMode.jsx](file:///c:/FlashcardMaster/src/Pages/OneQAMode.jsx)
- `Draggable` コンポーネントの `style` プロパティを修正し、`transform` 値の X 軸成分を強制的に `0px` に固定します。
- これにより、`lockAxis="y"` に頼らず、物理的に横方向への移動を防ぎます。

```jsx
style={{ 
  ...provided.draggableProps.style, 
  transform: provided.draggableProps.style?.transform 
    ? `translate(0px, ${provided.draggableProps.style.transform.split(',').pop()?.split(')')[0].trim() || '0px'})` 
    : undefined 
}}
```

## Verification Plan

### Manual Verification
1.  **一問一答モード**:
    - 複数のカードエディタを追加する。
    - グリップアイコンを使ってカードをドラッグし、マウスを左右に大きく動かしてもカードが横にズレないことを確認する。
    - 上下方向への並び替えがスムーズに行えることを確認する。
2.  **ビルド確認**:
    - `npm run build` を実行し、変更がビルドに悪影響を与えないことを確認する。
