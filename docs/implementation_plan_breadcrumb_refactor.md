# パンくずリストの実装リファクタリング計画書（更新版）

## 目的

パンくずリストの更新ロジックを最適化し、描画の同期（チラつき防止）とコンテキスト管理の簡素化を図ります。

## 変更内容

### 1. `src/contexts/BreadcrumbContext.tsx`

- `areCrumbsEqual` ヘルパー関数を追加。
- `setExtraCrumbs` で状態変更が必要な場合のみ更新するようにし、不要な再レンダリングを抑制。

### 2. `src/components/folder/layout/TreeViewLayout.tsx`

- コンテキスト通知を `onBreadcrumbContextChange` に統合。
- `useLayoutEffect` を使用して、パンくず表示用コンテキストを同期的に通知。

### 3. `src/pages/Folders.tsx`

- `explorerBreadcrumbContext` として状態を統合。
- パンくず（`extraCrumbs`）の計算を `useMemo` に集約。
- **`useLayoutEffect` を使用して計算されたパンくずをコンテキストに同期反映（描画前の反映を保証）。**

### 4. `src/layout/TitleBar.tsx`

- パンくずリストのレンダリングにおける `key` プロパティを、より一意な形式（ラベル、遷移先、フォルダID、インデックスの組み合わせ）に更新。

### 5. `src/pages/Dictionary.tsx`

- 未実装の Dictionary ページから `/folders` へのリダイレクト（`Navigate`）を追加。

## 影響範囲

- フォルダエクスプローラー（TreeView）
- タイトルバーのパンくず表示
- フォルダ詳細ページ
- 辞書ページ（リダイレクト）

## 確認事項

- [x] パンくずリストが正しく表示されること
- [x] フォルダ移動やカードセット選択時にパンくずがチラつくことなく追従すること
- [x] 辞書ページにアクセスした際、フォルダ一覧へ転送されること
