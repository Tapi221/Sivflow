# 不具合修正：罫線ズレとカード高さ変更不可

## 概要

右ペイン（CardEditorPane）の編集モードで発生している 2 つの不具合を修正する。

1. **罫線ズレ** : ブロック（テキスト・コードなど）の表示位置がカードの罫線グリッドにそろっていない
2. **カード高さ変更不可** : リサイズハンドルが表示されず、カードの高さを変更できない

---

## 原因分析

### 不具合①：罫線ズレ

`CardEditorPane.tsx` では次の構造でカードを描画している。

```
<CardShell>          ← card-shell + card-shell-body (pt-12 = 48px)
  <CardSurface ruled> ← bg-ruled (absolute inset-0 から 24px 間隔の罫線)
    <BlockEditor>    ← pt-4 md:pt-6 (16〜24px のパディング)
```

`CardSurface` の `bg-ruled` は `inset-0` を基点として 24px ピッチで罫線を描く。  
一方、`BlockEditor` のコンテンツは `pt-4`（16px on mobile）のオフセットから始まる。  
さらに `card-shell-body` の CSS にも `background-image: repeating-linear-gradient` で
**独自の罫線が重複定義**されており、`background-position: 0 var(--ruled-line-pitch)` が
`pt-12`（48px）のパディング内からずれている。

**結果** : 罫線が 16px（または 48px）ずれてコンテンツに重ならない。

**修正方針** :  
- `CardEditorPane` では `CardShell` の代わりにシンプルな白い `div` + `CardSurface` を使うか、  
- `card-shell-body` の `pt-12` と背景グラデーションを使わず、`CardSurface` の `bg-ruled` 一本に統一する。  
- 最も侵略範囲が少ない修正として：`CardEditorPane.tsx` の `<CardShell>` に `className` 追加で
  `card-shell-body` の `pt-12` を `pt-0` に上書きするか、  
  `<CardSurface>` の `ruled` に合わせて `BlockEditor` の `pt-4` を削除して `0px` にそろえる。

具体的には：
- `CardSurface.tsx` 側：`bg-ruled` の `background-position` を `BlockEditor` の top padding と
  一致させる。`ruledOffsetPx` prop を追加して `background-position: 0 ${offset}px` を制御する。
- `BlockEditor.tsx` 側：`pt-4 md:pt-6` を `pt-0` に変更し、spacing は `CardSurface` 側の
  padding に任せる。

### 不具合②：カード高さ変更不可

`CardEditorPane.tsx` の `<CardShell>` に `resizable={false}` / `showResizeHandle={false}` が
ハードコードされているため、リサイズハンドルが描画されない。

**修正方針** :  
`resizable={true}` / `showResizeHandle={true}` に変更し、`onHeightChange` と初期高さ管理を
コンポーネント内部（CardShell の内部 state）に任せる。

---

## 変更ファイル

### CardSurface レイヤ側

#### [MODIFY] [CardSurface.tsx](file:///c:/FlashcardMaster/src/Components/card/CardSurface.tsx)

- `ruledOffsetPx?: number` prop を追加（デフォルト `0`）
- `bg-ruled` の div に `style={{ backgroundPosition: \`0 ${ruledOffsetPx}px\` }}` を付与
- これにより呼び出し元から罫線の開始 Y 位置を合わせられるようにする

#### [MODIFY] [CardEditorPane.tsx](file:///c:/FlashcardMaster/src/Components/folder/CardEditorPane.tsx)

- `resizable={false}` → `resizable={true}` に変更
- `showResizeHandle={false}` → `showResizeHandle={true}` に変更
- `<CardSurface ruled={true} ruledRowPx={24} ruledOffsetPx={16}>` に変更し、
  BlockEditor の `pt-4`（16px）と罫線の開始位置を合わせる

#### [MODIFY] [BlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/BlockEditor.tsx)

- 最外 div の `pt-4 md:pt-6` を `pt-4` に統一（md:pt-6 は 24px で ruledRowPx=24 と合うが
  mobile 16px のズレを防ぐため `pt-0` にするか、全デバイスで `pt-4` に統一）
- 上記の `ruledOffsetPx={16}` に合わせて `pt-4`（16px）をそのまま維持することで整合させる

---

## 検証計画

### ビルド確認

```bash
# c:\FlashcardMaster で実行（dev は既に起動中）
npm run build
```

エラーなくビルドできることを確認する。

### 手動確認

1. ブラウザで `http://localhost:5173` を開く
2. 左ペインのフォルダツリーからカードを選択 → 右ペインに表示されることを確認
3. 右ペインの「編集」ボタンをクリック → 編集モードに入ることを確認
4. **罫線ズレ確認** : テキストブロックのテキストが罫線グリッド上に正しく乗っていること
5. **高さ変更確認** : カード下部にリサイズハンドルが表示され、ドラッグして高さを変更できること
