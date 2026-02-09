# フォルダー選択チェックボックスのサイズ調整

チェックボックスが `index.css` のグローバルスタイル（ボタンの最小サイズ 44px）の影響で巨大化している問題を修正します。

## 原因

`index.css` の `base` レイヤで以下のスタイルが定義されています：

```css
button, a, [role="button"] {
  min-width: 44px;
  min-height: 44px;
  ...
}
```

Radix UI の `Checkbox` は内部的に `button` 要素を使用しているため、この最小サイズが適用されています。

## 修正内容

### [checkbox.tsx](file:///c:/FlashcardMaster/src/Components/ui/checkbox.tsx)

`Checkbox` コンポーネントに `min-h-0 min-w-0` を追加して、グローバルの最小サイズ制限を解除します。

```tsx
// 修正イメージ
"peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow min-h-0 min-w-0 ..."
```

### 各コンポーネントでの微調整
ベースサイズが適正化された後、`FolderColumn.tsx` や `FolderTree.tsx` での `scale` や余白を微調整します。

## 検証計画

### 手動確認
- [ ] 選択モード時のチェックボックスが、テキストの高さに対して適切なサイズ（16px程度）になっていることを確認する。
- [ ] 他のボタン（44pxを維持すべきもの）に影響が出ていないことを確認する。
