# iOS風階層フォルダUI 実装計画

サイドバーからフォルダを選択した際に、iOS Files アプリ風の階層UIを実装します。個人開発前提のため、実装コストと保守性を最優先します。

## ユーザーレビューが必要な事項

> [!IMPORTANT]
> **実装アプローチの確認**
> 
> 以下の設計方針で進めますが、ご確認ください：
> 
> 1. **新規コンポーネント作成**: `HierarchicalFolderView.jsx` を新規作成し、既存の `Folders.jsx` とは独立させます
> 2. **段階的導入**: まずデスクトップ版のみ実装し、動作確認後にモバイル対応を追加します
> 3. **既存UIの保持**: 従来のツリー表示UIも残し、ユーザーが切り替えられるようにします（将来的な選択肢として）

## 変更内容

### [Component Name] 新規コンポーネント

#### [NEW] [HierarchicalFolderView.jsx](file:///c:/FlashcardMaster/src/Components/folder/HierarchicalFolderView.jsx)

**2カラムレイアウトの階層UI**

- 左カラム: 現在の階層のフォルダ一覧
- 右カラム: 選択中フォルダの中身（サブフォルダ or カード）
- 最大2カラムまで、3カラム以上は表示しない

**状態管理**
```javascript
const [selectedPath, setSelectedPath] = useState([]); // [rootId, folderId, subFolderId]
```

**主要機能**
- フォルダクリック → `selectedPath` に追加
- 戻るボタン → `selectedPath` の末尾を削除
- パンくずリスト表示
- スライドアニメーション（framer-motion使用）

---

### [Component Name] カスタムフック

#### [NEW] [useFolderPath.ts](file:///c:/FlashcardMaster/src/hooks/useFolderPath.ts)

パス管理用のカスタムフック

```typescript
export const useFolderPath = () => {
  const [path, setPath] = useState<string[]>([]);
  
  const pushFolder = (folderId: string) => {
    setPath(prev => [...prev, folderId]);
  };
  
  const popFolder = () => {
    setPath(prev => prev.slice(0, -1));
  };
  
  const resetPath = () => {
    setPath([]);
  };
  
  const getCurrentFolder = () => {
    return path[path.length - 1] || null;
  };
  
  return { path, pushFolder, popFolder, resetPath, getCurrentFolder };
};
```

---

### [Component Name] 既存ページの更新

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)

- デスクトップ表示時に `HierarchicalFolderView` を使用
- モバイル表示時は従来の `FolderTree` を使用
- レスポンシブ切り替えロジックの追加

```jsx
const isDesktop = useMediaQuery('(min-width: 1024px)');

return (
  <div>
    {isDesktop ? (
      <HierarchicalFolderView folders={folders} cards={cards} />
    ) : (
      <FolderTree folders={folders} cards={cards} />
    )}
  </div>
);
```

---

### [Component Name] スタイリング

#### [MODIFY] [index.css](file:///c:/FlashcardMaster/src/index.css)

階層UI用のスタイル定義

```css
/* 2カラムレイアウト */
.hierarchical-folder-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  height: calc(100vh - 200px);
}

/* スライドアニメーション */
.folder-slide-enter {
  transform: translateX(100%);
}

.folder-slide-enter-active {
  transform: translateX(0);
  transition: transform 300ms ease-out;
}
```

## 検証計画

### 自動テスト

現時点で既存のコンポーネントテストは存在しないため、自動テストは作成しません。

### 手動検証

#### デスクトップ表示（横幅 ≥ 1024px）

1. **基本動作**
   - ブラウザを開き、`/folders` にアクセス
   - 画面幅を 1024px 以上に設定
   - 2カラムレイアウトが表示されることを確認

2. **フォルダ選択**
   - 左カラムのフォルダをクリック
   - 右カラムにサブフォルダまたはカードが表示されることを確認
   - スライドアニメーションが動作することを確認

3. **階層移動**
   - サブフォルダをクリックして階層を深くする
   - パンくずリストが更新されることを確認
   - 戻るボタンで前の階層に戻れることを確認

4. **最大階層制限**
   - 3階層以上深くしても、2カラム表示が維持されることを確認

#### モバイル表示（横幅 < 1024px）

1. **従来UI表示**
   - 画面幅を 768px 以下に設定
   - 従来のツリー表示UIが表示されることを確認
   - フォルダクリックで `FolderView` ページに遷移することを確認

#### 学習導線

1. **学習開始ボタン**
   - 階層UI表示中でも「学習開始」ボタンが常に表示されることを確認
   - ボタンクリックで `StudyMode` に遷移することを確認

#### パフォーマンス

1. **大量フォルダ**
   - 50個以上のフォルダを作成
   - スクロールやアニメーションが滑らかに動作することを確認
