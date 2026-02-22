# 不具合修正：カード高さ裏表不一致 + ツールバー被さり

## 問題①：カードの高さが裏表でそろわない

### 原因
`CardEditorPane.tsx` では問題カード・解答カードがそれぞれ独立した `CardShell` コンポーネントで、
高さも独立した内部 state（`customHeightPx`）で管理される。  
一方をドラッグリサイズしても他方に伝わらない。

### 修正方針
`CardEditorPane` に共通の `cardHeightPx` state を追加し、
両 `CardShell` に `heightPx={cardHeightPx}` / `onHeightChange={setCardHeightPx}` を渡す。

---

## 問題②：ブロック追加ボタンがカードに被さって邪魔

### 原因
`BlockEditor` 内の `BlockToolbar` がカードの **内部**（`CardSurface`配下）に描画されている。
`PaperCardScaleFrame` でスケールされた `CardShell` の中にあるため、
ツールバーがカードのコンテンツ領域の上に重なって見える。

### 修正方針
ツールバーをカードの **外側**（`CardEditorPane` 内の各カードの上）に移動する。  
`BlockEditor` の `toolbarMountRef` prop を使い、カード外の div にポータルで描画する。  
`CardEditorPane` 側で `toolbarMountRefQ` / `toolbarMountRefA` を用意して渡す。

> - `BlockEditor` は既に `toolbarMountRef?: React.RefObject<HTMLDivElement | null>` prop を受け付け、
>   `createPortal` でそこにツールバーをマウントする実装済み。

---

## 変更ファイル

#### [MODIFY] [CardEditorPane.tsx](file:///c:/FlashcardMaster/src/Components/folder/CardEditorPane.tsx)

1. `cardHeightPx` state を追加（初期値 `null` = CardShell 内部で自動計算）
2. 問題・解答の両 `CardShell` に `heightPx={cardHeightPx ?? undefined}` / `onHeightChange={setCardHeightPx}` を渡す
3. 問題・解答それぞれのカードの **上**（`PaperCardScaleFrame` の外）に `<div ref={toolbarMountRefQ/A}>` を配置
4. `BlockEditor` に `toolbarMountRef={toolbarMountRefQ/A}` を渡す

---

## 検証計画

### 型チェック

```powershell
npx tsc --noEmit
```

### 手動確認（ブラウザ）

1. `http://localhost:5173` を開く
2. 右ペインでカードを選択 → 編集モードに入る
3. **高さ同期**: 問題カードの下部リサイズハンドルをドラッグ → 解答カードの高さも同じ値になることを確認
4. **ツールバー位置**: ブロック追加ボタン（「テキスト」「コード」など）がカードの **外側（上）** に表示されることを確認
