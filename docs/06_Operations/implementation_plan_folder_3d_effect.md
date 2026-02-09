# フォルダ管理画面の立体感向上（3Dエフェクト適用）

フォルダ一覧およびサブフォルダ一覧において、各フォルダアイテムに立体感（3D感）を出し、よりモダンでインタラクティブなUIに改善します。

## 変更の概要
- **FolderTree (メイン一覧):** 各行のカードに下部ボーダーと影を追加し、ホバー時の浮き上がり効果を強化します。
- **FolderView (サブフォルダチップ):** フォルダチップに厚みを感じさせるボーダーと影を追加し、ホバー時の視覚フィードバックを改善します。

## 提案される変更

### Folder UI Components

#### [MODIFY] [FolderTree.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTree.tsx)
- `FolderItem` 内のコンテナスタイルを修正。
- `border-b-2 border-slate-200` を追加して厚みを表現。
- `hover:-translate-y-0.5 hover:shadow-md` を追加してホバー時の立体感を向上。

#### [MODIFY] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- サブフォルダを表示する `Droppable` 内のチップスタイルを修正。
- `border-b-2 border-slate-300` を追加。
- `hover:-translate-y-0.5 hover:shadow-md` を追加。

## 検証計画

### 手動確認
1. **フォルダ管理画面 (`/Folders`):**
   - フォルダ一覧の各行がわずかに浮いているように見えることを確認。
   - マウスホバー時に少し上に浮き上がり、影が濃くなることを確認。
2. **フォルダ詳細画面 (`/FolderView`):**
   - 上部のサブフォルダチップがボタンのような立体感を持っていることを確認。
   - ホバー時にメインのリストと同様の浮き上がり効果があることを確認。

### 自動テスト
- `npm run build` を実行し、ビルドエラーが発生しないことを確認。
