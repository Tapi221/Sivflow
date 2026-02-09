# UIコントラスト改善計画

## 目的
ユーザーからのフィードバック「白すぎて見づらい」に対応するため、`FolderView` と `CardList` の配色は「一問一答モード (OneQAMode)」を参考に調整し、視認性とコントラストを向上させる。

参考スタイル (`OneQAMode.jsx`):
- 背景色: `bg-slate-50/50`
- カードボーダー: `border-slate-200/60`
- シャドウ: `shadow-sm`

## 変更内容

### [Pages] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- [MODIFY] 全体の背景色を `bg-white` から `bg-slate-50` (または `bg-slate-50/50`) に変更し、画面全体の「白飛び」感を軽減する。

### [Components] [CardList.tsx](file:///c:/FlashcardMaster/src/Components/card/CardList.tsx)
- [MODIFY] カード (`CardItem`) のボーダー色を `border-slate-100` から `border-slate-200` に変更し、背景との境界を明確にする。
- [MODIFY] テキストカラーの微調整（必要に応じて）：薄すぎるグレーを少し濃くする (`text-slate-400` -> `text-slate-500` 等)。

## 検証計画
### 手動検証
1.  ビルド (`npm run build`) が通ることを確認する（前回のビルドエラーも確認）。
2.  フォルダ画面を開き、背景が真っ白ではなく、わずかにグレーがかった色 (`slate-50`) になっていることを確認する。
3.  カードの枠線が以前よりはっきり見えることを確認する。
