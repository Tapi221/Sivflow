# 実装計画: タグによるカード絞り込み（ソート）機能

## 概要
`FolderView` (フォルダ詳細画面) において、タグを選択してカードを絞り込む（フィルタリングする）機能を実装します。
ユーザー要望は「タグを任意選択でソート」ですが、特定のタグを選択するUIの文脈からは「特定タグを持つカードを抽出・優先表示する」機能、つまり実質的なフィルタリング機能として実装するのがUX上適切です。

## 変更内容

### [src/Pages/FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)

1.  **タグデータの取得**:
    *   `useTags` フックを使用し、現在のフォルダ（またはルートフォルダ）に紐づくタグ一覧を取得します。
    *   `breadcrumbs` からルートフォルダIDを特定し、`useTags(rootFolderId)` で呼び出します。

2.  **フィルターステートの追加**:
    *   `const [selectedTags, setSelectedTags] = useState([])`
    *   選択されたタグ名の配列を管理します。

3.  **UIの追加**:
    *   フィルタリング用メニュー（DropdownMenu）を追加します（ソートボタンの横など）。
    *   タグ一覧を表示し、チェックボックス等で複数選択可能にします。
    *   「全選択解除」などの便利機能もあると良いでしょう。

4.  **フィルタリングロジックの実装**:
    *   `sortedCards` の `useMemo` 内で、`selectedTags` に基づくフィルタリングを追加します。
    *   **ロジック**: 選択されたタグが1つ以上ある場合、「そのいずれかのタグを持つカード（OR条件）」を表示します。これが最も直感的な検索挙動です。

## 技術的詳細

### ルートフォルダIDの特定
```javascript
const rootFolderId = breadcrumbs.length > 0 ? breadcrumbs[0].id : (folder?.parentFolderId ? /* logic to find root */ : folderId);
// 面倒な場合は、useTagsの引数を省略すると全タグ取得になるか確認、あるいは現在のfolderIdを渡してよしなにやる。
// useTagsの実装を見る限り、rootFolderIdを渡すと絞り込まれる。
// breadcrumbsはすでに計算されているので、breadcrumbs[0].id がルートフォルダのIDと考えて良い。
```

### フィルタリングロジック
```javascript
const sortedCards = useMemo(() => {
    let result = [...folderCards].sort(...)
    
    // Tag Filter
    if (selectedTags.length > 0) {
        result = result.filter(card => {
            if (!card.tags || !Array.isArray(card.tags)) return false;
            return card.tags.some(tag => selectedTags.includes(tag));
        });
    }

    // ... existing sort logic ...
}, [folderCards, filterMode, sortMode, selectedTags]);
```

### UI配置
ヘッダーのツールバー（選択モード、同期ボタン、メニューがあるあたり）に追加します。

## 検証計画
1.  タグが付与されたカードを複数用意する。
2.  「タグフィルター」メニューを開き、タグを選択する。
3.  選択したタグを持つカードのみが表示されることを確認する。
4.  タグの選択を解除し、全カードが表示されることを確認する。
