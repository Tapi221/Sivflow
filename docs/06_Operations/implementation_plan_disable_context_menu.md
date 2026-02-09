# ブラウザのデフォルトコンテキストメニューの無効化

ブラウザの右クリックメニュー（コンテキストメニュー）が表示されないようにし、よりアプリらしい体験を提供します。

## 変更内容

### [App.tsx](file:///c:/FlashcardMaster/src/App.tsx)

`AppContent` コンポーネントに `useEffect` を追加し、グローバルに `contextmenu` イベントをインターセプトして `preventDefault()` を呼び出します。

#### [MODIFY] [App.tsx](file:///c:/FlashcardMaster/src/App.tsx)

```tsx
useEffect(() => {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };
  window.addEventListener('contextmenu', handleContextMenu);
  return () => window.removeEventListener('contextmenu', handleContextMenu);
}, []);
```

## 検証計画

### 手動確認
- [ ] アプリケーションの任意の場所で右クリックし、ブラウザのデフォルトメニューが表示されないことを確認する。
- [ ] 入力フィールド（もしあれば）での挙動を確認する。
