# 実装計画：カード全体の罫線表示の改善

カード内のブロックが存在しない空白部分にも、背景の罫線（ruled lines）が継続して表示されるように修正します。

## 現状の課題
現在、`CardSurface` はコンテンツ（ブロック）の高さに合わせて伸縮するため、カード自体の高さがコンテンツより高い場合（手動でリサイズした場合など）、下部の空白部分に罫線が表示されません。

## 修正内容

### [index.css](file:///c:/FlashcardMaster/src/index.css)
- `.card-shell-body` に `flex flex-col` を追加します。
- これにより、子要素である `CardSurface`（`flex-1` を持つ）が親要素の高さ（カードシェルの高さ）まで自動的に引き伸ばされます。
- `CardSurface` 内の罫線背景は `absolute inset-0` で配置されているため、引き伸ばされた領域全体に罫線が表示されるようになります。

```diff
 .card-shell-body {
-  @apply relative flex-1 min-h-0 overflow-y-auto overscroll-contain pt-12;
+  @apply relative flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain pt-12;
   overflow-x: clip !important;
```

## 検証計画

### 手動確認
1. **編集画面での確認**: カードエディタでカードの下部ハンドルをドラッグして高さを広げた際、ブロックがない部分にも罫線が表示され続けることを確認します。
2. **閲覧画面での確認**: 閲覧モードでも、カードの高さに対してコンテンツが少ない場合に、下部まで罫線が引かれていることを確認します。
3. **既存レイアウトの確認**: `flex flex-col` を追加したことで、画像ブロックや他の要素の配置が崩れていないか確認します。

### 自動検証
- `npm run build` を実行し、CSS の変更がビルドに影響を与えないことを確認。
