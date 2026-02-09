# プレビュー表示の閲覧モード完全一致化 実装計画

## 概要
ユーザー要望「プレビュー画面を閲覧モードで表示されるカードと全く同じ様にする」に対応します。
現在のエディタ内プレビュー（`CardEditor.tsx`）は、カード（`Flashcard`）をさらに「ガラスモーフィズム風のコンテナ（`bg-slate-50/90`, `p-8`, `border`など）」で囲んでいるため、二重枠のようになり、実際の閲覧モード（`CardViewer` や `CardPopup`）と見た目が異なります。
この不要な装飾コンテナを削除し、閲覧モード（ポップアップ表示）に近いシンプルな構成に変更します。

## 変更内容

### Components/card/CardEditor.tsx

`DialogContent` 内の構造を簡素化します。

1.  **装飾コンテナの削除**
    - `bg-slate-50/90 backdrop-blur-xl p-4 md:p-8 ...` の `div` を削除します。
    - カード自体（`Flashcard`）が持つスタイル（`bg-white`, `shadow`, `rounded`）をメインにします。

2.  **レイアウト調整**
    - `DialogContent` の背景を透明 (`bg-transparent`)、枠線なしにし、中央に `Flashcard` を配置します。
    - ヘッダー（"リアルカードプレビュー"）は削除するか、カードの外側に控えめに配置し、カードのデザインに干渉しないようにします（今回は「全く同じ」を目指すため、カード外に配置または削除）。
    - 閉じるボタンを `CardPopup` と同様に右上のアイコン、または下部のシンプルなボタンとして配置します。

3.  **幅の調整**
    - `max-w-4xl` を維持しつつ、余計なパディングがなくなる分、カードが自然なサイズで表示されるようにします。

```tsx
// 変更後の Dialog イメージ（CardPopup.tsx に近づける）
<DialogContent className="max-w-4xl w-[95vw] p-0 border-none bg-transparent shadow-none">
  {/* ヘッダー・閉じるボタン等はカードの外に配置 */}
  <div className="relative w-full">
     <div className="mb-4 flex justify-between items-center px-4 md:px-0">
        <span className="text-xs font-bold uppercase tracking-widest text-white/90 shadow-sm">Preview</span>
     </div>
     
     <div className="relative group">
       <Button 
         variant="ghost" 
         size="icon" 
         onClick={() => setShowPreview(false)}
         className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full"
       >
         <X className="w-6 h-6" />
       </Button>

       <Flashcard 
         card={formData} 
         previewMode={true} 
         isFlipped={isPreviewFlipped}
         onFlip={() => setIsPreviewFlipped(!isPreviewFlipped)}
         className="h-auto min-h-[500px]"
       />
     </div>
  </div>
</DialogContent>
```

## 検証計画

### 手動検証
1. **カード編集画面**
   - 「プレビュー」ボタンをクリック。
   - 表示されるダイヤログが、フォルダ閲覧画面でカードをクリックした時（または学習モード）のカードと同じ見た目であることを確認する。
   - 特に、カードの外側に余計なグレーの枠やパディングがなく、カードの白背景がダイアログの背景（オーバーレイ）上に直接浮いているように見えるかを確認。
   - `Flashcard.tsx` で設定した `max-w-2xl` のテキスト幅制限が、プレビューでも有効であることを確認。
