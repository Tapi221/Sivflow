# フォルダタブUIの洗練計画

ユーザーの要望に基づき、サイドバー（Explorer）の上部タブをアイコンのみのシンプルなデザインに変更し、「お気に入り」のアイコンを星（Star）に変更します。

## 変更内容

### [アイコンの一貫性：Bookmark -> Star]
以下のファイルで「お気に入り/ブックマーク」として使われている `Bookmark` を `Star` に置き換えます。
- `src/Components/explorer/ExplorerTabs.tsx`
- `src/Components/explorer/FavoritesPanel.tsx`
- `src/Components/folder/ContextMenu.tsx`
- `src/Components/folder/DocumentRowMenu.tsx`
- `src/Components/folder/TreeViewLayout.tsx`
- `src/Components/card/CardViewer.tsx`
- `src/Components/card/Flashcard.tsx`
- `src/Components/card/CardPopup.tsx`
- `src/Components/card/CardList.tsx`
- `src/Components/card/CardEditor.tsx`

### [タブのアイコンのみ表示]
- `src/Components/explorer/ExplorerTabs.tsx`
    - `<span>` によるラベル表示を削除または `hidden` に。
    - アイコンのみで中央揃えになるようスタイルを調整。

## 検証計画
1. タブからテキストが消え、アイコンのみが表示されているか。
2. 「お気に入り」タブのアイコンが星型になっているか。
3. マウスホバー時に `title` 属性（ツールチップ）でタブ名が表示されるか。
4. 他の箇所（メニュー等）でも星型アイコンに統一されているか。
