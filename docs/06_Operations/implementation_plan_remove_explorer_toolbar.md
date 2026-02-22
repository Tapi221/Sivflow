# Explorerツールバーの削除計画

ユーザーからのフィードバックに基づき、フォルダ管理画面（Explorer）の上部に表示されているツールバー（「作成先」の表示と「+ New」ボタン）を削除します。

## 変更内容

### [FolderTreeWithCards.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTreeWithCards.tsx)
- `ExplorerToolbar` コンポーネントの定義を削除（または非表示化）。
- `FolderTreeWithCards` の `return` 文から `ExplorerToolbar` の呼び出しを削除。

## 補足
- このツールバーを削除すると、サイドバーからの新規作成ができなくなりますが、メイン領域（FolderView）に作成ボタンがある場合はそちらを利用することになります。
