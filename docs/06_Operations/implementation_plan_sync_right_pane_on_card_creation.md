# 新規カード作成時の右ペイン連動修正

サイドバーのフォルダメニューから「新規カード」を作成した際に、右ペインも自動的にそのカードの編集画面（エディタ）に切り替わるように改善します。

## 現状の課題
- `FolderTreeWithCards.tsx` の `handleCreateCardAction` において、カード作成成功後に右ペインを遷移させないようにするロジック（または遷移処理の欠如）がある。
- そのため、ユーザーはカード作成後に手動で作成されたカードをクリックしてエディタを開く必要がある。

## 修正内容

### [FolderTreeWithCards.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTreeWithCards.tsx)

#### 1. `handleCreateCardAction` の修正
- カード作成（`onCreateCard`）が成功し、`createdCardId` が取得できたタイミングで、`onItemSelect({ type: 'card', id: createdCardId })` を呼び出します。
- これにより、親コンポーネント（`TreeViewLayout` -> `Folders`）の状態が更新され、URL同期と右ペインの表示切り替えが誘発されます。

## 検証計画

### 手動確認
1. サイドバーで任意のフォルダを右クリック（またはメニューボタンをクリック）し、「[NEW] カードを追加」を選択する。
2. 左側のリストに「無題のカード」が追加されると同時に、右ペインにそのカードのエディタが表示されることを確認する。
3. フォルダダッシュボード上の「新規カード作成」ボタンの挙動（既に連動しているはず）が壊れていないことを確認する。

### 自動検証
- `npm run build` で型定義の不整合などがないか確認。
