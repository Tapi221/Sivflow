# 罫線背景デザインの再適用計画（復旧）

データ喪失に伴い、以前合意した「最も薄い初期の状態（濃度 0.02）」での罫線デザインを再実装します。

## 変更内容の概要

### 1. グローバルスタイルの復旧
#### [MODIFY] [index.css](file:///c:/FlashcardMaster/src/index.css)
- `.bg-ruled` ユーティリティクラスを濃度 `0.02` で再定義。

### 2. メイン画面の背景適用
#### [MODIFY] [Dashboard.jsx](file:///c:/FlashcardMaster/src/Pages/Dashboard.jsx)
#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
#### [MODIFY] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- メインコンテナの最後に `bg-ruled` を持つ絶対配置の `div` を追加（z-0）。
- 濃度が確実に反映されるよう、インラインスタイルで `rgba(0, 0, 0, 0.02)` を指定。
- 既存のコンテンツは `z-10` で前面に出し、不透明なカードで罫線を隠す。

### 3. 個別コンポーネントからの罫線削除（フィードバック反映）
#### [MODIFY] [Dashboard.jsx](file:///c:/FlashcardMaster/src/Pages/Dashboard.jsx)
- 「作成中のカードがありません」のプレースホルダーから `bg-ruled` を削除。
#### [MODIFY] [FolderDashboard.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderDashboard.tsx)
- メインコンテナから `bg-ruled` を削除。
#### [MODIFY] [FolderMemo.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderMemo.tsx)
- メモ空状態のプレースホルダーから `bg-ruled` を削除。

## 検証計画
- `Dashboard`, `Folders`, `FolderView` の広範囲な背景には引き続き非常に薄い罫線が表示されているか。
- 各カード内や特定のコンポーネント領域から罫線が消え、クリーンな表示に戻っているか。
