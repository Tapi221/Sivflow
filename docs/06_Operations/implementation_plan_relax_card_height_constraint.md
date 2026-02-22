# カードリサイズ制限の緩和案

カードをよりコンパクトにリサイズできるように、`CardShell.tsx` 内の最小高さ計算ロジックを緩和します。

## 変更内容

### [CardShell](file:///c:/FlashcardMaster/src/Components/card/CardShell.tsx)

#### [MODIFY] [CardShell.tsx](file:///c:/FlashcardMaster/src/Components/card/CardShell.tsx)

- `computeMinHeight` 内の `widthBasedMin` の計算を修正します。
- 現在は幅の 3/4 (75%) を最小としていますが、これを幅の 1/8 (12.5%) 程度に引き下げるか、`resizable` が true の場合は大幅に緩和します。
- これにより、内容が少ないカードをより薄く（コンパクトに）調整できるようになります。

## 検証計画

### 手動確認
1. カードエディタを開く。
2. カードの下端にあるリサイズハンドルをドラッグして、上に持ち上げる。
3. 以前よりもカードを薄くできることを確認する。
4. 内容がある場合は、内容が完全に見切れる前で止まる（`snappedContentHeight` による制限）ことを確認する。
