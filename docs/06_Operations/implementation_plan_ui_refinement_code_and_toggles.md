# UI改善：コードブロックの省スペース化とトグルボタンのデザイン変更

## 概要
1.  **コードブロック**: テキストブロックと同等の高さになるよう、余白とヘッダーを削減・調整します。
2.  **トグルボタン**: ブックマーク・不確実（はてな）ボタンを「円形」かつ「立体感（3D）」のあるデザインに変更します。

## 変更内容

### 1. `src/Components/card/CodeBlockEditor.tsx`
*   **ヘッダー（ツールバー）**: パディングを削減し、高さを抑えます。
*   **エディタエリア**: `padding` を `6` から `3` 程度に削減します。
*   **コンテナ**: 不要な余白を削除します。

### 2. `src/Components/card/CardEditor.tsx`
*   **トグルボタン（ブックマーク、不確実）**:
    *   形状を `rounded-md` から `rounded-full` に変更。
    *   サイズを少し大きくし（クリックしやすく）、アイコンの比率を調整。
    *   **立体感**: `shadow-[0_2px_0_rgb(0,0,0,0.1)]` のような「底に厚みのある」シャドウとボーダーを適用し、押下時（active）に沈むアニメーションを追加します。

## デザイン詳細 (Tailwind CSS)

### トグルボタン共通スタイル
```css
w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
border border-slate-200 bg-white text-slate-400 shadow-[0_2px_0_#e2e8f0]
active:shadow-none active:translate-y-[2px]
```

### アクティブ時 (Bookmark)
```css
bg-pink-50 text-pink-500 border-pink-200 shadow-[0_2px_0_#fbcfe8]
```
(※元のコードではPrimary色ですが、ブックマークは一般的のピンク/赤系が目立つため、指定がなければPrimaryを使いますが、元が `primary-600` なのでそれに従いつつ少しリッチにします)

### アクティブ時 (Uncertainty)
```css
bg-amber-50 text-amber-500 border-amber-200 shadow-[0_2px_0_#fde68a]
```

## 検証手順
1.  この変更を適用。
2.  編集画面を開く。
3.  コードブロックを追加し、空の状態での高さがテキストブロックとほぼ同じ（コンパクト）であることを確認。
4.  上部のヘッダー（Index Q... の横）にあるトグルボタンが円形で立体的に見えることを確認。
5.  トグルをクリックし、凹むアニメーションと色の変化を確認。
