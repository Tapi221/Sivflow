# 作業ビューのサイドバー開閉機能（Ctrl+B）の実装計画

作業ビュー（VSCode風レイアウト）において、左側のサイドバー（フォルダツリー）をキーボードショートカット `Ctrl+B`（または `Cmd+B`）で開閉できるようにします。また、このショートカットを設定画面に明記します。

## 変更内容

### [Component Name] folder

#### [MODIFY] [TreeViewLayout.tsx](file:///c:/FlashcardMaster/src/Components/folder/TreeViewLayout.tsx)
- `isSidebarCollapsed` 状態を追加（初期値は localStorage から取得、デフォルトは false）。
- `useEffect` を使用して `Ctrl+B` / `Cmd+B` のキーダウンイベントを監視し、サイドバーの表示状態を切り替える。
- サイドバー（左ペイン）に `transition-all` と `overflow-hidden` を適用し、幅 0 で折りたためるようにする。
- 幅が狭まったときに境界線（リサイズハンドル）を非表示にする。

### [Component Name] settings

#### [MODIFY] [SettingsDialog.jsx](file:///c:/FlashcardMaster/src/Components/settings/SettingsDialog.jsx)
- ショートカットキー一覧のタブに 「`Ctrl + B`: 作業ビューのサイドバー開閉」を追加。

### [Component Name] docs

#### [MODIFY] [shortcut_keys_specification.md](file:///c:/FlashcardMaster/docs/04_Reference/shortcut_keys_specification.md)
- すでに記載がある場合は、作業ビューでの挙動であることを明確化するか、またはグローバルな挙動として統一する。

## 検証計画

### 自動テスト
- 現状、UIコンポーネントのインタラクションに関する自動テストがないため、手動検証を優先します。

### 手動検証
1. **作業ビューの開閉**:
   - フォルダ画面に移動し、「作業」ビューを選択。
   - `Ctrl + B` (Windows) または `Cmd + B` (Mac) を押し、左側のフォルダツリーがスムーズに消えることを確認。
   - 再度押して、元の幅（リサイズされていた場合はその幅）で再表示されることを確認。
2. **状態の永続化**:
   - サイドバーを閉じた状態でページをリロードし、閉じたままになっているか確認。
3. **設定画面の確認**:
   - 設定画面のショートカットキー一覧に正しく記載されているか確認。
