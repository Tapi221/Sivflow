# 実装計画 - フォルダサイドバー表示モード設定の追加

フォルダサイドバーの表示モード（自動、ツリー表示、遷移表示）をユーザー設定に追加し、エクスプローラーの表示に反映させます。

## 変更内容

### 1. `src/types/domain/user.ts`

- `UserSettings` インターフェースに `folderSidebarDisplayMode` フィールドを追加します。
- 型: `"auto" | "tree" | "navigation"` (任意)

### 2. `src/hooks/settings/useUserSettings.ts`

- `DEFAULT_SETTINGS` に `folderSidebarDisplayMode: "auto"` を追加します。

### 3. `src/components/settings/SettingsDialog.jsx`

- `folderSidebarDisplayModeOptions` 定義を追加します。
- テーマカラー設定タブ内に、表示モードを切り替えるためのUI（ボタン群）を実装します。

### 4. `src/components/folder/layout/TreeViewLayout.tsx`

- `TreeViewTabContent` コンポーネントに `sidebarDisplayMode` プロップを渡すように変更します。
- 値は `settings?.folderSidebarDisplayMode ?? "auto"` を使用します。

### 5. `src/components/folder/components/TreeViewTabContent.tsx`

- `TreeViewTabContentProps` インターフェースに `sidebarDisplayMode` を追加します。
- `FolderTreeWithCards` コンポーネントに `sidebarDisplayMode` を伝搬させます。

### 6. `src/components/folder/components/views/FolderTreeWithCards.tsx`

- `FolderTreeWithCardsProps` インターフェースに `sidebarDisplayMode` を追加します。
- 送信されたモードに基づき、`effectiveSidebarDisplayMode` を計算するロジックを実装します。
- サイドバーの描画条件（`isSectionListVisible`, `isScopedNavigationVisible`）を更新します。
- フォルダ選択時のルートスコープ解決ロジック（`resolveRootFolderId`）を適用範囲を広げて利用するように修正します。
- 表示モードの切り替えに応じて適切なコンポーネント（`FolderTreeArborist` または `RootFolderPanelList`）を表示するように条件分岐を修正します。

## 影響範囲

- 設定ダイアログの「テーマカラー」タブに新しい設定項目が表示されます。
- サイドバーのエクスプローラー表示形式をユーザーが明示的に固定できるようになります。
