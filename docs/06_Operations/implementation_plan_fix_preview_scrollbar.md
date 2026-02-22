# プレビュー画面のレイアウト修正および不要UIの削除計画

## 概要
プレビュー画面において、ユーザーから指摘された「カード横の変な横線（高さ変更バーのようなもの）」を削除し、画面レイアウトを最適化します。
ユーザーの指摘に基づき、プレビューモードではカードの高さ変更機能（リサイズ機能）を無効化します。
また、カード横に表示されるスクロールバーを画面端に移動させ、ナビゲーションボタンも非表示にすることで、閲覧に集中できるクリーンな表示を実現します。

## 変更内容

### 1. `src/Components/card/CardEditor.tsx`

プレビューモーダル全体の構造を見直し、スクロールバーを画面右端へ移動させます。

**変更内容:**
- カードコンテナの `overflow-y-auto` を削除し、画面全体のコンテナでスクロールするように変更します。
- `overflow-x-hidden` を追加して、横スクロールの発生を防止します。

```jsx
<div className="fixed inset-0 z-[45]">
  <div className="absolute inset-0 bg-[#F5F7F8]" />
  
  {/* スクロールコンテナを画面全体に設定 */}
  <div className="relative w-full h-full overflow-y-auto overflow-x-hidden">
    <div className="flex min-h-full items-center justify-center p-4 md:p-12">
       <div 
         className="w-full max-w-[680px] cursor-default" // スクロール設定を削除
         onClick={(e) => e.stopPropagation()}
       >
         <Flashcard 
            card={dataToSave} 
            previewMode={true}
            // ...
         />
       </div>
    </div>
  </div>
  {/* HUD ... */}
</div>
```

### 2. `src/Components/card/Flashcard.tsx`

プレビューモード時の不要なUI要素（リサイズ機能、ナビゲーション）を無効化します。

**変更点1: リサイズ機能の無効化**
`resizable` プロパティを `previewMode` のときは `false` に設定します。
これにより、リサイズハンドル用のスペースやスタイルが適用されなくなり、意図しない「バー」の表示を防ぎます。

```diff
  <CardShell
    // ...
-   resizable={previewMode ? true : undefined}
+   resizable={previewMode ? false : undefined} // プレビュー時はリサイズ不可
-   resizeStepPx={previewMode ? 24 : undefined}
+   resizeStepPx={undefined}
    showResizeHandle={false}
    // ...
```

**変更点2: ナビゲーションボタンの非表示**
プレビューモードでは「Previous / Next」ボタンを表示しないようにします。

```diff
- {(onNext || onPrev || (currentIndex !== undefined && totalCards !== undefined)) && (
+ {!previewMode && (onNext || onPrev || (currentIndex !== undefined && totalCards !== undefined)) && (
```

## 検証計画

### 動作確認
1.  **プレビュー表示**: カード編集画面からプレビューを開き、カードの下や横に「横線」や「バー」が表示されていないことを確認する。
2.  **スクロールバー位置**: コンテンツが長い場合、スクロールバーがカード横ではなく画面右端に表示されることを確認する。
3.  **リサイズ不可**: カードの高さを変更する操作ができなくなっていることを確認する。
4.  **ナビゲーション非表示**: Previous/Nextボタンが表示されていないことを確認する。

