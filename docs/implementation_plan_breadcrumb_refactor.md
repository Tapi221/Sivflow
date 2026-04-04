# パンくずリストの実装リファクタリング計画書

## 目的

パンくずリストの更新ロジックを最適化し、不要な再レンダリングを抑制するとともに、コンテキスト管理を簡素化します。

## 変更内容

### 1. `src/contexts/BreadcrumbContext.tsx`

- `areCrumbsEqual` ヘルパー関数を追加し、パンくずの配列が実質的に等しい場合に状態更新をスキップするように変更します。

### 2. `src/components/folder/layout/TreeViewLayout.tsx`

- `onFolderContextChange` と `onCardSetContextChange` を `onBreadcrumbContextChange` に統合します。
- `useLayoutEffect` を使用して、表示に関するコンテキストの変更を同期的に通知するように修正します。

### 3. `src/pages/Folders.tsx`

- フォルダとカードセットのコンテキスト状態を `explorerBreadcrumbContext` として一つに統合します。
- `useMemo` を活用してパンくずリスト（`extraCrumbs`）を計算し、`useEffect` でコンテキストに反映する形式に変更します。

### 4. `src/layout/TitleBar.tsx`

- パンくずリストのレンダリングにおける `key` プロパティを、ラベル、遷移先、フォルダIDを含むより一意なものに更新します。

### 5. `src/pages/Dictionary.tsx`

- 未実装の Dictionary ページから `/folders` へのリダイレクト（`Navigate`）を追加しました。

## 影響範囲

- フォルダエクスプローラー（TreeView）
- タイトルバーのパンくず表示
- フォルダ詳細ページ

## 確認事項

- [ ] パンくずリストが正しく表示されること
- [ ] フォルダ移動やカードセット選択時にパンくずが追従すること
- [ ] 無限ループや不要な再レンダリングが発生していないこと
