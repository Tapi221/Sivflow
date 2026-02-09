# ツリービュー(VSCode型 + 右編集ペイン)の実装計画

## 目的

フォルダ画面に新しいビュー「作業(ツリー)」を追加し、VSCode型のツリー表示と右側の編集ペインを提供します。既存の「カラム」ビューと共存させ、ビュー切替で使い分けできるようにします。

## 現状分析

### 既存の実装状況

1. **ビュー切替機能**: 既に実装済み
   - `viewMode` state (line 40-43): `'tree'` または `'column'`
   - localStorage永続化済み (line 51-53)
   - ビュー切替UI (line 329-346): ツリー/カラムボタン

2. **既存のツリービュー**: `FolderTree`コンポーネント
   - 現在の`'tree'`モードで使用されている
   - フォルダの階層表示、展開/折りたたみ機能あり
   - カードは表示していない(フォルダのみ)

3. **カード編集画面**: `CardEditor.tsx`
   - props: `card`, `folderId`, `onSave`, `onCancel`, `isLoading`など
   - 完全な編集機能を持つコンポーネント

4. **状態管理**:
   - `selectedFolderId`: フォルダ選択時にナビゲーション(line 69-71)
   - カード選択時もナビゲーション(line 73-75)
   - 現在は別ページに遷移する設計

### 実装が必要な機能

1. **新しいビュー名の変更**:
   - 現在の`'tree'`を`'work'`(作業)に変更
   - または既存の`'tree'`を拡張して左右分割レイアウトに変更

2. **TreeViewLayoutコンポーネント**:
   - 左右2分割レイアウト
   - 左: フォルダツリー(カード表示あり)
   - 右: カード編集ペイン

3. **状態管理の追加**:
   - `selectedCardId`: 現在選択中のカードID
   - ページ遷移せずに同一ページ内で編集

## 提案する実装方針

### オプション1: 既存の'tree'モードを拡張

既存の`'tree'`モードを左右分割レイアウトに変更し、右側にカード編集ペインを追加します。

**メリット**:
- 既存のviewMode切替ロジックをそのまま活用
- ユーザーの設定(localStorage)も維持
- 実装がシンプル

**デメリット**:
- 既存のツリービューの挙動が変わる

### オプション2: 新しい'work'モードを追加(採用)

`'tree'`, `'column'`, `'work'`の3つのモードを用意します。

**メリット**:
- 既存のツリービューの挙動を維持
- 段階的な移行が可能
- ユーザーが用途に応じて使い分けできる

**デメリット**:
- ビュー切替UIが3つになる
- 実装量が若干増える

**→ ユーザーの要望によりオプション2を採用します**

## 実装する変更内容

### 1. viewModeの拡張

**ファイル**: `src/pages/Folders.jsx`

**変更内容** (line 40-43):
```jsx
const [viewMode, setViewMode] = useState(() => {
  const saved = localStorage.getItem('folderViewMode');
  // 'tree', 'column', 'work' の3つをサポート
  return saved !== null ? saved : 'tree';
});
```

### 2. ビュー切替UIの拡張

**ファイル**: `src/pages/Folders.jsx`

**変更内容** (line 329-346):
```jsx
<div className="hidden md:flex items-center bg-slate-50/50 rounded-xl p-1 gap-1 border border-slate-100/50 mr-2">
  <Button
    variant={viewMode === 'tree' ? 'default' : 'ghost'}
    size="sm"
    className={`h-8 px-3 rounded-lg text-xs font-bold ${viewMode === 'tree' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
    onClick={() => setViewMode('tree')}
  >
    ツリー
  </Button>
  <Button
    variant={viewMode === 'column' ? 'default' : 'ghost'}
    size="sm"
    className={`h-8 px-3 rounded-lg text-xs font-bold ${viewMode === 'column' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
    onClick={() => setViewMode('column')}
  >
    カラム
  </Button>
  <Button
    variant={viewMode === 'work' ? 'default' : 'ghost'}
    size="sm"
    className={`h-8 px-3 rounded-lg text-xs font-bold ${viewMode === 'work' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
    onClick={() => setViewMode('work')}
  >
    作業
  </Button>
</div>
```

### 3. TreeViewLayoutコンポーネントの作成

**ファイル**: `src/Components/folder/TreeViewLayout.tsx` (新規)

**機能**:
- 左右2分割レイアウト(Flexbox使用)
- 左ペイン: `FolderTreeWithCards`コンポーネント(後述)
- 右ペイン: `CardEditorPane`コンポーネント(後述)
- レスポンシブ対応(モバイルでは左のみ表示)

**レイアウト仕様**:
```tsx
<div className="flex h-full gap-4">
  {/* 左ペイン */}
  <div className="min-w-[260px] max-w-[420px] w-[320px] overflow-y-auto">
    <FolderTreeWithCards ... />
  </div>
  
  {/* 右ペイン */}
  <div className="flex-1 min-w-0 overflow-y-auto">
    <CardEditorPane ... />
  </div>
</div>
```

### 4. FolderTreeWithCardsコンポーネントの作成

**ファイル**: `src/Components/folder/FolderTreeWithCards.tsx` (新規)

**機能**:
- 既存の`FolderTree`を拡張
- フォルダ配下のカードも表示
- カード表示は選択中のフォルダ配下のみ(パフォーマンス考慮)
- フォルダクリック → `onFolderSelect(folderId)`
- カードクリック → `onCardSelect(cardId)`

**表示仕様**:
- フォルダ: 既存のFolderTreeと同じ
- カード: フォルダの子要素として表示
  - アイコン: 小さめのカードアイコン
  - テキスト: カードタイトル(または「無題のカード」)
  - 選択状態: 背景ハイライト

### 5. CardEditorPaneコンポーネントの作成

**ファイル**: `src/Components/folder/CardEditorPane.tsx` (新規)

**機能**:
- 選択されたカードの編集画面を表示
- 既存の`CardEditor`コンポーネントをラップ
- カード未選択時: プレースホルダ表示
- カード保存時: ページ遷移せずに更新

**プレースホルダ**:
```tsx
<div className="flex items-center justify-center h-full text-slate-400">
  <div className="text-center">
    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
    <p className="text-sm font-bold">左のツリーからカードを選択してください</p>
  </div>
</div>
```

### 6. Folders.jsxの修正

**変更内容**:

1. **状態管理の追加** (line 33付近):
```jsx
const [selectedCardId, setSelectedCardId] = useState(null);
```

2. **ハンドラーの修正**:
```jsx
// フォルダ選択(作業モード用)
const handleSelectFolderInWork = (folderId) => {
  setSelectedFolderId(folderId);
  // カード選択は維持
};

// カード選択(作業モード用)
const handleSelectCardInWork = (cardId) => {
  setSelectedCardId(cardId);
};

// カード保存(作業モード用)
const handleSaveCardInWork = async (data) => {
  // 既存のuseCardsフックを使用
  // 保存後、selectedCardIdは維持
};
```

3. **ビュー切替部分の修正** (line 482-628):
```jsx
{viewMode === 'work' ? (
  <TreeViewLayout
    folders={displayFolders}
    cards={cards}
    selectedFolderId={selectedFolderId}
    selectedCardId={selectedCardId}
    onFolderSelect={handleSelectFolderInWork}
    onCardSelect={handleSelectCardInWork}
    onSaveCard={handleSaveCardInWork}
    // その他のprops
  />
) : viewMode === 'column' ? (
  <ColumnNavigator ... />
) : (
  <FolderTree ... />
)}
```

### 7. データ取得ロジック

既存の`useFolders()`と`useCards()`フックをそのまま使用します。

**カード表示の最適化**:
- ツリーには全フォルダを表示
- カードは選択中のフォルダ配下のみ表示(フィルタリング)
- 大量データ対応は後回し(まずは基本実装)

## 検証計画

### 自動テスト

既存のテストは存在しないため、今回は手動テストのみで検証します。

### 手動テスト

#### テスト1: ビュー切替

1. フォルダ画面を開く
2. 「ツリー」ボタンをクリック
3. **期待結果**: 左右2分割のレイアウトが表示される
4. 「カラム」ボタンをクリック
5. **期待結果**: カラムビューに切り替わる
6. ページをリロード
7. **期待結果**: 最後に選択したビューが表示される

#### テスト2: フォルダ・カード選択

1. ツリービューを表示
2. 左ペインでフォルダをクリック
3. **期待結果**: フォルダが展開され、配下のカードが表示される
4. カードをクリック
5. **期待結果**: 右ペインにカード編集画面が表示される
6. カードの内容を確認
7. **期待結果**: 選択したカードの内容が表示されている

#### テスト3: カード編集

1. ツリービューでカードを選択
2. 右ペインでカードの内容を編集
3. 保存ボタンをクリック
4. **期待結果**: カードが保存され、エラーが表示されない
5. 別のカードを選択
6. **期待結果**: 編集した内容が保存されている
7. 元のカードを再選択
8. **期待結果**: 編集した内容が表示される

#### テスト4: 未選択時の表示

1. ツリービューを表示
2. カードを選択していない状態
3. **期待結果**: 右ペインにプレースホルダが表示される
4. プレースホルダのメッセージを確認
5. **期待結果**: 「左のツリーからカードを選択してください」と表示される

#### テスト5: レスポンシブ対応

1. ブラウザの幅を狭くする(モバイルサイズ)
2. **期待結果**: ツリービューは表示されず、既存のFolderTreeが表示される
3. ブラウザの幅を広げる(デスクトップサイズ)
4. **期待結果**: 左右2分割のレイアウトが表示される

#### テスト6: 既存機能の互換性

1. カラムビューを表示
2. フォルダをクリック
3. **期待結果**: 既存の挙動(ページ遷移)が維持されている
4. カードをクリック
5. **期待結果**: カード詳細ページに遷移する

## 実装順序

1. `CardEditorPane.tsx`の作成(プレースホルダのみ)
2. `FolderTreeWithCards.tsx`の作成(フォルダのみ、カードは後回し)
3. `TreeViewLayout.tsx`の作成
4. `Folders.jsx`の修正(状態管理、ハンドラー、ビュー切替)
5. `CardEditorPane.tsx`の完成(CardEditorの統合)
6. `FolderTreeWithCards.tsx`の完成(カード表示の追加)
7. 手動テスト
8. デプロイ

## 注意事項

- モバイルでは既存のFolderTreeを表示(左右分割は表示しない)
- カード編集時のページ遷移を防ぐため、`handleSelectCard`の挙動を変更
- localStorage の`folderViewMode`は既存のまま(`'tree'` or `'column'`)
- 大量データ対応(仮想化)は今回は実装しない(将来の拡張として残す)
